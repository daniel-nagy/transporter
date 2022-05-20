import { createRegistry } from "./FinalizationRegistry";
import { safeParse } from "./json";
import { getIn, isObject, mapValues, ObjectPath } from "./object";
import type { ObservableLike } from "./Observable";

// Do not assume a specific JavaScript runtime. However, require these global
// types.
declare type Timeout = unknown;
declare const clearTimeout: (timeout: Timeout) => void;
declare const self: InternalMessageTarget;
declare const setTimeout: (
  callback: Function,
  delay?: number,
  ...args: any[]
) => Timeout;

export const MESSAGE_SOURCE = "transporter";

export interface ExternalMessageTarget {
  postMessage(message: string, targetOrigin?: string): void;
}

export interface InternalMessageTarget {
  addEventListener(type: "message", listener: MessageSubscriber): void;
  removeEventListener(type: "message", listener: MessageSubscriber): void;
}

enum MessageType {
  Call = "call",
  Error = "error",
  GarbageCollect = "garbage_collect",
  Get = "get",
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
  readonly args: Exportable[];
  readonly path: ObjectPath;
  readonly type: MessageType.Call;
}

interface IErrorMessage extends IMessage {
  readonly type: MessageType.Error;
  readonly error: Exportable;
}

interface IGarbageCollectMessage extends IMessage {
  readonly type: MessageType.GarbageCollect;
}

interface IGetValueMessage extends IMessage {
  readonly path: ObjectPath;
  readonly type: MessageType.Get;
}

interface IPingMessage extends IMessage {
  readonly type: MessageType.Ping;
}

interface IPongMessage extends IMessage {
  readonly type: MessageType.Pong;
}

interface ISetValueMessage extends IMessage {
  readonly type: MessageType.Set;
  readonly value: Exportable;
}

type Channel = {
  readonly external: ExternalMessageTarget;
  readonly internal: InternalMessageTarget;
  readonly origin?: string;
  readonly scope: string | null;
  readonly timeout: number;
};

type EncodedFunction = { scope: string; type: "function" };
type EncodedUndefined = { type: "undefined" };
type Message =
  | ICallFunctionMessage
  | IErrorMessage
  | IGarbageCollectMessage
  | IGetValueMessage
  | IPingMessage
  | IPongMessage
  | ISetValueMessage;
type Promisify<T> = [T] extends Promise<unknown> ? T : Promise<T>;
type Nothing = undefined | null;

export type Exportable =
  | boolean
  | null
  | number
  | string
  | void
  | Exportable[]
  | ExportableFunction
  | ExportableObject;

export type ExportableFunction = (
  ...args: any[] // Exportable[]
) => Exportable | Promise<Exportable>;

export type ExportableObject = { [key: string]: Exportable };

export type Exported<T extends Exportable> = T extends
  | Exportable[]
  | ExportableObject
  ? // @ts-expect-error Type 'T[key]' does not satisfy the constraint 'Exportable'.
    { [key in keyof T]: Exported<T[key]> }
  : T extends ExportableFunction
  ? Proxied<T>
  : T;

export type MessageEvent = { data: string; source: ExternalMessageTarget };
export type MessageSubscriber = (event: MessageEvent) => void;
export type NamedExport = ExportableFunction | ObservableLike<Exportable>;

export type NamedExports = {
  [key: string]: NamedExport;
};

export type Proxied<T> = T extends (...args: infer A) => infer R
  ? // @ts-expect-error Type 'A' does not satisfy the constraint 'Exportable'.
    //                  Type 'R' does not satisfy the constraint 'Exportable'.
    (...args: Exported<A>) => Promisify<Exported<R>>
  : never;

export type RemoteExport<T extends NamedExport> = T extends ObservableLike<
  infer U
>
  ? // @ts-expect-error Type 'U' does not satisfy the constraint 'Exportable'.
    ObservableLike<Exported<U>>
  : T extends ExportableFunction
  ? Proxied<T>
  : never;

export type RemoteModule<T extends NamedExports> = {
  [key in keyof T]: RemoteExport<T[key]>;
};

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
  channel.external.postMessage(
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

export function createModule<T extends NamedExports>({
  export: api,
  from: internal = self,
  namespace: scope = null,
}: {
  export: T;
  from?: InternalMessageTarget;
  namespace?: string | null;
}): { release(): void } {
  const release = () => internal.removeEventListener("message", onMessage);

  async function onMessage(event: MessageEvent) {
    const data = safeParse(event.data);

    if (!isMessage(data) || data.scope !== scope) return;

    const channel = { external: event.source, internal, scope, timeout: 0 };
    const message = decode({ channel, message: data });

    switch (message.type) {
      case MessageType.Call:
        try {
          event.source.postMessage(
            encode({
              channel,
              message: {
                id: message.id,
                scope,
                source: MESSAGE_SOURCE,
                type: MessageType.Set,
                value: await (
                  getFunctionWithContext(
                    api,
                    message.path
                  ) as ExportableFunction
                )(...message.args),
              },
            })
          );
        } catch (exception) {
          event.source.postMessage(
            encode({
              channel,
              message: {
                id: message.id,
                scope,
                source: MESSAGE_SOURCE,
                type: MessageType.Error,
                error: exception as Exportable,
              },
            })
          );
        }
        break;
      case MessageType.GarbageCollect:
        release();
        break;
      case MessageType.Get:
        event.source.postMessage(
          encode({
            channel,
            message: {
              id: message.id,
              scope,
              source: MESSAGE_SOURCE,
              type: MessageType.Set,
              value: getIn(api, message.path) as Exportable,
            },
          })
        );
        break;
      case MessageType.Ping:
        event.source.postMessage(
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

  internal.addEventListener("message", onMessage);

  return { release };
}

export function useModule<T extends NamedExports>({
  from: external,
  namespace: scope = null,
  origin,
  timeout = 1000,
  to: internal = self,
}: {
  from: ExternalMessageTarget;
  namespace?: string | null;
  origin?: string;
  timeout?: number;
  to?: InternalMessageTarget;
}): RemoteModule<T> {
  return createProxy({
    channel: { external, internal, origin, scope, timeout },
  });
}

function awaitResponse<T extends Exportable>({
  channel,
  message,
}: {
  channel: Channel;
  message: Message;
}): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const { id, scope } = message;
    const { cancel: cancelTimeout } = schedule(channel.timeout, () =>
      reject(new TimeoutError("A signal was not received in the allowed time."))
    );

    channel.internal.addEventListener("message", function onMessage(event) {
      const data = safeParse(event.data);

      if (!isMessage(data) || data.id !== id) return;

      const message = decode({
        channel: { ...channel, external: event.source },
        message: data,
      });

      switch (message.type) {
        case MessageType.Pong:
          cancelTimeout();
          break;
        case MessageType.Set:
          channel.internal.removeEventListener("message", onMessage);
          resolve(message.value as T);
          break;
        case MessageType.Error:
          channel.internal.removeEventListener("message", onMessage);
          reject(message.error);
          break;
        default:
        // no default
      }
    });

    channel.external.postMessage(
      encode({
        channel,
        message: { id, scope, source: MESSAGE_SOURCE, type: MessageType.Ping },
      }),
      channel.origin
    );

    channel.external.postMessage(encode({ channel, message }), channel.origin);
  });
}

function createProxy<T extends NamedExports>({
  channel,
  path = [],
  promiseLike = true,
}: {
  channel: Channel;
  path?: ObjectPath;
  promiseLike?: boolean;
}): RemoteModule<T> {
  return new Proxy((() => {}) as unknown as RemoteModule<T>, {
    apply(_target, _thisArg, args) {
      const [func] = path.slice(-1);

      switch (func) {
        case "then":
          return awaitResponse({
            channel,
            message: {
              id: generateId(),
              path: path.slice(0, -1),
              scope: channel.scope,
              source: MESSAGE_SOURCE,
              type: MessageType.Get,
            },
          }).then(...args);
        default:
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
      }
    },
    get(_target, prop, _receiver) {
      switch (true) {
        case typeof prop === "symbol":
          return undefined;
        case prop === "then" && !promiseLike:
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
          promiseLike: false,
        });
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
          export: value,
          from: channel.internal,
          namespace: scope,
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

function generateId(): string {
  return Math.random().toString(36).slice(2, 11);
}

function getFunctionWithContext(api: NamedExports, path: ObjectPath): Function {
  const [subpath, name] = [path.slice(0, -1), ...path.slice(-1)];

  return name
    ? (...args: Exportable[]) => (getIn(api, subpath) as any)[name]?.(...args)
    : (getIn(api, path) as Function);
}

function isEncodedFunction(value: unknown): value is EncodedFunction {
  return isObject(value) && value.type === "function";
}

function isEncodedUndefined(value: unknown): value is EncodedUndefined {
  return isObject(value) && value.type === "undefined";
}

function isMessage(message: unknown): message is Message {
  return isObject(message) && message.source === MESSAGE_SOURCE;
}

function schedule(time: number, callback: () => void): { cancel(): void } {
  const id = setTimeout(callback, time);
  return { cancel: () => clearTimeout(id) };
}
