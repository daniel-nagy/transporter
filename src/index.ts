import { createRegistry } from "./FinalizationRegistry";
import { safeParse } from "./json";
import { getIn, isObject, mapOwnProps, mapValues, ObjectPath } from "./object";
import { flatMap, map, Observable, ObservableLike } from "./Observable";
import { generateId } from "./uuid";

// Do not assume a specific JavaScript runtime. However, require these global
// types.
declare type Timeout = unknown;
declare const clearTimeout: (timeout: Timeout) => void;
declare const setTimeout: (
  callback: Function,
  delay?: number,
  ...args: any[]
) => Timeout;

export const MESSAGE_SOURCE = "transporter";

enum MessageType {
  Call = "call",
  Error = "error",
  GarbageCollect = "garbage_collect",
  Ping = "ping",
  Pong = "pong",
  Set = "set",
}

interface IMessage {
  readonly id: string;
  readonly source: typeof MESSAGE_SOURCE;
  readonly type: MessageType;
  readonly uri: string;
}

interface ICallFunctionMessage extends IMessage {
  readonly args: Transportable[];
  readonly path: ObjectPath;
  readonly type: MessageType.Call;
}

interface IErrorMessage extends IMessage {
  readonly error: Transportable;
  readonly type: MessageType.Error;
}

interface IGarbageCollectMessage extends IMessage {
  readonly type: MessageType.GarbageCollect;
}

interface IPingMessage extends IMessage {
  readonly type: MessageType.Ping;
}

interface IPongMessage extends IMessage {
  readonly type: MessageType.Pong;
}

interface ISetValueMessage extends IMessage {
  readonly type: MessageType.Set;
  readonly value: Transportable;
}

type EncodedFunction = { type: "function"; uri: string };
type EncodedUndefined = { type: "undefined" };
type Message =
  | ICallFunctionMessage
  | IErrorMessage
  | IGarbageCollectMessage
  | IPingMessage
  | IPongMessage
  | ISetValueMessage;
type Promisify<T> = [T] extends Promise<unknown> ? T : Promise<T>;

export type Client = {
  link<T extends ServiceAPI>(uri: string): RemoteService<T>;
};

export type RemoteFunction<T> = T extends (...args: infer A) => infer R
  ? // @ts-expect-error Type 'R' does not satisfy the constraint 'Transportable'.
    (...args: A /* Transportable[] */) => Promisify<Transported<R>>
  : never;

export type RemoteValue<T extends ServiceAPI[keyof ServiceAPI]> =
  T extends ObservableLike<infer U>
    ? // @ts-expect-error Type 'U' does not satisfy the constraint 'Transportable'.
      ObservableLike<Transported<U>>
    : T extends TransportableFunction
    ? RemoteFunction<T>
    : // @ts-expect-error Type 'T' does not satisfy the constraint 'Transportable'.
      ObservableLike<Transported<T>>;

export type RemoteService<T extends ServiceAPI> = {
  [key in keyof T]: RemoteValue<T[key]>;
};

export type Route = { readonly path: string; readonly provide: Service };
export type Router = readonly Route[];
export type Server = { stop(): void };

export type Service = {
  [name: string]: ObservableLike<Transportable> | TransportableFunction;
};

export type ServiceAPI = {
  [name: string]: Transportable | ObservableLike<Transportable>;
};

export type SessionManager = {
  connect: ObservableLike<SessionPort>;
};

export type SessionPort = {
  receive: ObservableLike<string>;
  send(message: string): void;
};

export type Transportable =
  | boolean
  | null
  | number
  | string
  | Transportable[]
  | TransportableFunction
  | TransportableObject
  | void;

export type TransportableFunction = (
  ...args: any[] // Transported[]
) => Transportable | Promise<Transportable>;

export type TransportableObject = { [key: string]: Transportable };

export type Transported<T extends Transportable> = T extends
  | Transportable[]
  | TransportableObject
  ? // @ts-expect-error Type 'T[key]' does not satisfy the constraint 'Transportable'.
    { [key in keyof T]: Transported<T[key]> }
  : T extends TransportableFunction
  ? RemoteFunction<T>
  : T;

export class TimeoutError extends Error {
  readonly name = "TimeoutError";

  constructor(message?: string) {
    super(message);
    // TypeScript cannot properly extend the native Error class when targeting
    // ES5. See https://stackoverflow.com/a/41102306.
    Object.setPrototypeOf(this, TimeoutError.prototype);
  }
}

const registry = createRegistry<{
  port: SessionPort;
  timeout?: number;
  uri: string;
}>(({ port, timeout, uri }) => {
  port.send(
    encode({
      message: {
        id: generateId(),
        source: MESSAGE_SOURCE,
        type: MessageType.GarbageCollect,
        uri,
      },
      port,
      timeout,
    })
  );
});

export function createClient({
  port,
  timeout,
}: {
  port: SessionPort;
  timeout?: number;
}): Client {
  return {
    link(uri: string) {
      return createProxy({ port, timeout, uri });
    },
  };
}

export function createServer({
  router,
  scheme,
  sessionManagers,
  timeout,
}: {
  router: Router;
  scheme: string;
  sessionManagers: [SessionManager, ...SessionManager[]];
  timeout?: number;
}): Server {
  const connections = sessionManagers.map((sessionManager) =>
    router.map(({ path, provide: service }) => {
      const matches = (uri: string): boolean => {
        const [uriScheme, uriPath = ""] = uri.split(":");

        return (
          uriScheme === scheme &&
          trimStart(uriPath, "/") === trimStart(path, "/")
        );
      };

      const observable = flatMap(sessionManager.connect, (port) => {
        return map(port.receive, (data) => [port, data] as const);
      });

      const { unsubscribe } = observable.subscribe(async ([port, data]) => {
        const parsedData = safeParse(data);

        if (!isMessage(parsedData) || !matches(parsedData.uri)) return;

        const message = decode({ message: parsedData, port, timeout });

        switch (message.type) {
          case MessageType.Call:
            try {
              port.send(
                encode({
                  message: {
                    id: message.id,
                    source: MESSAGE_SOURCE,
                    type: MessageType.Set,
                    uri: message.uri,
                    value: await callFunction(
                      service,
                      message.path,
                      message.args
                    ),
                  },
                  port,
                  timeout,
                })
              );
            } catch (exception) {
              port.send(
                encode({
                  message: {
                    error: exception as Transportable,
                    id: message.id,
                    source: MESSAGE_SOURCE,
                    type: MessageType.Error,
                    uri: message.uri,
                  },
                  port,
                  timeout,
                })
              );
            }
            break;
          case MessageType.GarbageCollect:
            unsubscribe();
            break;
          case MessageType.Ping:
            port.send(
              encode({
                message: {
                  id: message.id,
                  source: MESSAGE_SOURCE,
                  type: MessageType.Pong,
                  uri: message.uri,
                },
                port,
                timeout,
              })
            );
            break;
          default:
          // no default
        }
      });
      return unsubscribe;
    })
  );

  return {
    stop: () => flatten(connections).forEach((disconnect) => disconnect()),
  };
}

export function createService<T extends ServiceAPI>(api: T): Service {
  return mapOwnProps(api, (value) => {
    switch (true) {
      case isFunction(value):
        return value;
      case isObservableLike(value):
        return value;
      default:
        return Observable.of(value);
    }
  });
}

function awaitResponse<T extends Transportable>({
  message,
  port,
  timeout = 1000,
}: {
  message: Message;
  port: SessionPort;
  timeout?: number;
}): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const { id, uri } = message;
    const { cancel: cancelTimeout } = schedule(timeout, () =>
      reject(new TimeoutError("Connection timeout."))
    );

    const { unsubscribe } = port.receive.subscribe((data) => {
      const parsedData = safeParse(data);

      if (!isMessage(parsedData) || parsedData.id !== id) return;

      const message = decode({ message: parsedData, port, timeout });

      switch (message.type) {
        case MessageType.Pong:
          cancelTimeout();
          break;
        case MessageType.Set:
          unsubscribe();
          resolve(message.value as T);
          break;
        case MessageType.Error:
          unsubscribe();
          reject(message.error);
          break;
        default:
        // no default
      }
    });

    port.send(
      encode({
        message: {
          id,
          source: MESSAGE_SOURCE,
          type: MessageType.Ping,
          uri,
        },
        port,
        timeout,
      })
    );

    port.send(encode({ message, port, timeout }));
  });
}

function callFunction(
  from: Service,
  path: ObjectPath,
  args: Transportable[]
): Transportable | Promise<Transportable> {
  const [subpath, name] = [path.slice(0, -1), ...path.slice(-1)];

  return name
    ? (getIn(from, subpath) as any)[name]?.(...args)
    : (getIn(from, path) as Function)(...args);
}

function createProxy<T extends ServiceAPI>({
  path = [],
  port,
  promiseLike = false,
  timeout,
  uri,
}: {
  path?: ObjectPath;
  port: SessionPort;
  promiseLike?: boolean;
  timeout?: number;
  uri: string;
}): RemoteService<T> {
  return new Proxy((() => {}) as unknown as RemoteService<T>, {
    apply(_target, _thisArg, args) {
      return awaitResponse({
        message: {
          args,
          id: generateId(),
          path,
          source: MESSAGE_SOURCE,
          type: MessageType.Call,
          uri,
        },
        port,
        timeout,
      });
    },
    get(_target, prop, _receiver) {
      switch (true) {
        case typeof prop === "symbol":
          return undefined;
        case prop === "then" && !promiseLike:
          // Prevents promise chaining when the proxy is wrapped in a promise.
          return undefined;
        case prop === "toJSON":
          return undefined;
        default:
          return createProxy({
            path: [...path, prop as string],
            port,
            timeout,
            uri,
          });
      }
    },
    ownKeys(_target) {
      // Prevents enumeration of the proxy. Attempting to enumerate the proxy
      // will throw a `TypeError`, this includes using the rest syntax when
      // destructuring the proxy.
      return undefined as unknown as [];
    },
  });
}

function decode({
  message,
  port,
  timeout,
}: {
  message: Message;
  port: SessionPort;
  timeout?: number;
}): Message {
  return mapValues(message, (value) => {
    switch (true) {
      case isEncodedFunction(value): {
        const proxy = createProxy({ port, timeout, uri: value.uri }).default;
        registry?.register(proxy, { port, timeout, uri: value.uri });
        return proxy;
      }
      case isEncodedUndefined(value): {
        return undefined;
      }
      default:
        return value;
    }
  });
}

function encode({
  message,
  port,
  timeout,
}: {
  message: Message;
  port: SessionPort;
  timeout?: number;
}) {
  return JSON.stringify(message, (_key, value) => {
    switch (typeof value) {
      case "function": {
        const scheme = generateId();

        createServer({
          router: [{ path: "/", provide: createService({ default: value }) }],
          scheme,
          sessionManagers: [{ connect: Observable.of(port) }],
          timeout,
        });

        return { type: "function", uri: scheme } as EncodedFunction;
      }
      case "undefined":
        return { type: "undefined" };
      default:
        return value;
    }
  });
}

function flatten<T>(list: ReadonlyArray<T | ReadonlyArray<T>>): T[] {
  return list.reduce<T[]>(
    (acc, item) => [...acc, ...(Array.isArray(item) ? flatten(item) : [item])],
    []
  );
}

function isEncodedFunction(value: unknown): value is EncodedFunction {
  return isObject(value) && value.type === "function";
}

function isEncodedUndefined(value: unknown): value is EncodedUndefined {
  return isObject(value) && value.type === "undefined";
}

function isFunction(value: unknown): value is Function {
  return typeof value === "function";
}

function isMessage(message: unknown): message is Message {
  return isObject(message) && message.source === MESSAGE_SOURCE;
}

function isObservableLike(value: unknown): value is ObservableLike<any> {
  return isObject(value) && isFunction(value.subscribe);
}

function schedule(time: number, callback: () => void): { cancel(): void } {
  const id = setTimeout(callback, time);
  return { cancel: () => clearTimeout(id) };
}

function trimStart(string: string, char: string): string {
  return string.startsWith(char) ? string.slice(1) : string;
}
