import { createRegistry } from "./FinalizationRegistry";
import { safeParse } from "./json";
import { getIn, isObject, mapOwnProps, mapValues, ObjectPath } from "./object";
import { Observable, ObservableLike } from "./Observable";

// Do not assume a specific JavaScript runtime. However, require these global
// types.
declare type Timeout = unknown;
declare const clearTimeout: (timeout: Timeout) => void;
declare const self: MessagePortLike;
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
  readonly scope: string | null;
  readonly source: typeof MESSAGE_SOURCE;
  readonly type: MessageType;
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

type Channel = {
  readonly port: MessagePortLike;
  readonly scope: string | null;
  readonly timeout: number;
};

type EncodedFunction = {
  scope: string;
  type: "function";
};

type EncodedUndefined = { type: "undefined" };
type Message =
  | ICallFunctionMessage
  | IErrorMessage
  | IGarbageCollectMessage
  | IPingMessage
  | IPongMessage
  | ISetValueMessage;
type Promisify<T> = [T] extends Promise<unknown> ? T : Promise<T>;

export type MessageEvent = { data: string };

export type MessagePortLike = {
  addEventListener(type: "message", listener: MessageSubscriber): void;
  postMessage(message: string): void;
  removeEventListener(type: "message", listener: MessageSubscriber): void;
};

export type MessageSubscriber = (event: MessageEvent) => void;

export type ModuleContainer = (
  createConnection: (port: MessagePortLike) => void
) => void;

export type ModuleExport = Transportable | ObservableLike<Transportable>;
export type ModuleExports = { [name: string]: ModuleExport };

export type RemoteFunction<T> = T extends (...args: infer A) => infer R
  ? // @ts-expect-error Type 'R' does not satisfy the constraint 'Transportable'.
    (...args: A /* Transportable[] */) => Promisify<Transported<R>>
  : never;

export type RemoteValue<T extends ModuleExport> = T extends ObservableLike<
  infer U
>
  ? // @ts-expect-error Type 'U' does not satisfy the constraint 'Transportable'.
    ObservableLike<Transported<U>>
  : T extends TransportableFunction
  ? RemoteFunction<T>
  : // @ts-expect-error Type 'T' does not satisfy the constraint 'Transportable'.
    ObservableLike<Transported<T>>;

export type RemoteModule<T extends ModuleExports> = {
  [key in keyof T]: RemoteValue<T[key]>;
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

const registry = createRegistry<Channel>((channel) => {
  channel.port.postMessage(
    encode({
      channel,
      message: {
        id: generateId(),
        scope: channel.scope,
        source: MESSAGE_SOURCE,
        type: MessageType.GarbageCollect,
      },
    })
  );
});

export function createModule<T extends ModuleExports>({
  export: api,
  namespace: scope = null,
  timeout = 1000,
  within: container = (createConnection) => createConnection(self),
}: {
  export: T;
  namespace?: string | null;
  timeout?: number;
  within?: ModuleContainer;
}): { release(): void } {
  const _exports = mapOwnProps(api, (value) => {
    switch (true) {
      case isFunction(value):
        return value;
      case isObservableLike(value):
        return value;
      default:
        return Observable.of(value);
    }
  });

  const portSubscriptions: (() => void)[] = [];
  const releaseAll = () => portSubscriptions.forEach((release) => release());

  container((port) => {
    const channel = { port, scope, timeout };
    const release = () => port.removeEventListener("message", onMessage);

    async function onMessage(event: MessageEvent) {
      const data = safeParse(event.data);

      if (!isMessage(data) || data.scope !== scope) return;

      const message = decode({ channel, message: data });

      switch (message.type) {
        case MessageType.Call:
          try {
            port.postMessage(
              encode({
                channel,
                message: {
                  id: message.id,
                  scope,
                  source: MESSAGE_SOURCE,
                  type: MessageType.Set,
                  value: await callFunction(
                    _exports,
                    message.path,
                    message.args
                  ),
                },
              })
            );
          } catch (exception) {
            port.postMessage(
              encode({
                channel,
                message: {
                  id: message.id,
                  scope,
                  source: MESSAGE_SOURCE,
                  type: MessageType.Error,
                  error: exception as Transportable,
                },
              })
            );
          }
          break;
        case MessageType.GarbageCollect:
          release();
          break;
        case MessageType.Ping:
          port.postMessage(
            encode({
              channel,
              message: {
                id: message.id,
                scope,
                source: MESSAGE_SOURCE,
                type: MessageType.Pong,
              },
            })
          );
          break;
        default:
        // no default
      }
    }

    port.addEventListener("message", onMessage);
    portSubscriptions.push(release);
  });

  return { release: releaseAll };
}

export function useModule<T extends ModuleExports>({
  from: port,
  namespace: scope = null,
  timeout = 1000,
}: {
  from: MessagePortLike;
  namespace?: string | null;
  timeout?: number;
}): RemoteModule<T> {
  return createProxy({ channel: { port, scope, timeout } });
}

function awaitResponse<T extends Transportable>({
  channel,
  message,
}: {
  channel: Channel;
  message: Message;
}): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const { id, scope } = message;
    const { cancel: cancelTimeout } = schedule(channel.timeout, () =>
      reject(new TimeoutError("Connection timeout."))
    );

    channel.port.addEventListener("message", function onMessage(event) {
      const data = safeParse(event.data);

      if (!isMessage(data) || data.id !== id) return;

      const message = decode({ channel, message: data });

      switch (message.type) {
        case MessageType.Pong:
          cancelTimeout();
          break;
        case MessageType.Set:
          channel.port.removeEventListener("message", onMessage);
          resolve(message.value as T);
          break;
        case MessageType.Error:
          channel.port.removeEventListener("message", onMessage);
          reject(message.error);
          break;
        default:
        // no default
      }
    });

    channel.port.postMessage(
      encode({
        channel,
        message: { id, scope, source: MESSAGE_SOURCE, type: MessageType.Ping },
      })
    );

    channel.port.postMessage(encode({ channel, message }));
  });
}

function createProxy<T extends ModuleExports>({
  channel,
  path = [],
  promiseLike = false,
}: {
  channel: Channel;
  path?: ObjectPath;
  promiseLike?: boolean;
}): RemoteModule<T> {
  return new Proxy((() => {}) as unknown as RemoteModule<T>, {
    apply(_target, _thisArg, args) {
      return awaitResponse({
        channel,
        message: {
          args,
          id: generateId(),
          path,
          scope: channel.scope,
          source: MESSAGE_SOURCE,
          type: MessageType.Call,
        },
      });
    },
    get(_target, prop, _receiver) {
      switch (true) {
        case typeof prop === "symbol":
          return undefined;
        case prop === "then" && !promiseLike:
          // Prevents promise chaining when the proxy is wrapped in a promise.
          return undefined;
        default:
          return createProxy({ channel, path: [...path, prop as string] });
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
  channel,
  message,
}: {
  channel: Channel;
  message: Message;
}): Message {
  return mapValues(message, (value) => {
    switch (true) {
      case isEncodedFunction(value): {
        const proxy = createProxy({
          channel: { ...channel, scope: value.scope },
        }).default;
        registry?.register(proxy, { ...channel, scope: value.scope });
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

function encode({ channel, message }: { channel: Channel; message: Message }) {
  return JSON.stringify(message, (_key, value) => {
    switch (typeof value) {
      case "function": {
        const scope = generateId();

        createModule({
          export: { default: value },
          namespace: scope,
          within: (createConnection) => createConnection(channel.port),
        });

        return { scope, type: "function" };
      }
      case "undefined":
        return { type: "undefined" };
      default:
        return value;
    }
  });
}

function callFunction(
  from: ModuleExports,
  path: ObjectPath,
  args: Transportable[]
): Transportable | Promise<Transportable> {
  const [subpath, name] = [path.slice(0, -1), ...path.slice(-1)];

  return name
    ? (getIn(from, subpath) as any)[name]?.(...args)
    : (getIn(from, path) as Function)(...args);
}

function generateId(): string {
  return Math.random().toString(36).slice(2, 11);
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
