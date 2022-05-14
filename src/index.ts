import { createRegistry } from "./FinalizationRegistry";
import { safeParse } from "./json";
import { getIn, isObject, mapValues, ObjectPath } from "./object";

// Do not assume a specific JavaScript runtime. However, require these global
// types.
declare global {
  type Timeout = unknown;
  const clearTimeout: (timeout: Timeout) => void;
  const self: InternalMessageTarget;
  const setTimeout: (
    callback: Function,
    delay?: number,
    ...args: any[]
  ) => Timeout;
}

export const MESSAGE_SOURCE = "transporter";

export interface ExternalMessageTarget {
  postMessage(message: string): void;
}

export interface InternalMessageTarget {
  addEventListener(type: "message", listener: MessageSubscriber): void;
  removeEventListener(type: "message", listener: MessageSubscriber): void;
}

enum MessageType {
  Call = "call",
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
  readonly scope: string | null;
  readonly timeout: number;
};

type AnyFunction = (...args: any[]) => any;
type EncodedFunction = { scope: string; type: "function" };
type EncodedUndefined = { type: "undefined" };
type Message =
  | ICallFunctionMessage
  | IGarbageCollectMessage
  | IGetValueMessage
  | IPingMessage
  | IPongMessage
  | ISetValueMessage;
type Promisify<T> = [T] extends Promise<unknown> ? T : Promise<T>;
type Nothing = undefined | null;
type UnknownArray = unknown[];
type UnknownObject = { [key: string]: unknown };

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

export type Exported<T> = T extends UnknownObject
  ? { [key in keyof T]: Exported<T[key]> }
  : T extends AnyFunction
  ? Proxied<T>
  : T;

export type MessageEvent = { data: string; source: ExternalMessageTarget };
export type MessageSubscriber = (event: MessageEvent) => void;

export type Proxied<T> = T extends (...args: infer A) => infer R
  ? (...args: Exported<A>) => Promisify<Exported<R>>
  : never;

export type Remote<T> = T extends Nothing
  ? Promise<T>
  : T extends UnknownArray | UnknownObject
  ? Promise<T> & { [key in keyof T]: Remote<T[key]> }
  : T extends AnyFunction
  ? Proxied<T>
  : Promisify<T>;

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

export function createModule<T extends Exportable>({
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
        event.source.postMessage(
          encode({
            channel,
            message: {
              id: message.id,
              scope,
              source: MESSAGE_SOURCE,
              type: MessageType.Set,
              value: await (getIn(api, message.path) as ExportableFunction)(
                ...message.args
              ),
            },
          })
        );
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

export function useModule<T>({
  from: external,
  namespace: scope = null,
  timeout = 1000,
  to: internal = self,
}: {
  from: ExternalMessageTarget;
  namespace?: string | null;
  timeout?: number;
  to?: InternalMessageTarget;
}): Remote<T> {
  return createProxy({ channel: { external, internal, scope, timeout } });
}

function awaitResponse<T extends Exported<Exportable>>({
  channel,
  message,
}: {
  channel: Channel;
  message: Message;
}): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const { id, scope } = message;
    const { cancel } = schedule(channel.timeout, () =>
      reject(new TimeoutError("A signal was not received in the allowed time."))
    );

    channel.internal.addEventListener("message", function onMessage(event) {
      const data = safeParse(event.data);

      if (!isMessage(data) || data.id !== id) return;

      const message = decode({
        channel: { ...channel, external: event.source },
        message: data,
      });

      if (message.type === MessageType.Pong) cancel();
      if (message.type !== MessageType.Set) return;

      channel.internal.removeEventListener("message", onMessage);

      switch (typeof message.value) {
        case "function":
          // Wrap the function to prevent `resolve` from calling `then` on the
          // proxied value which will cause an infinite loop.
          resolve(((...args: Exportable[]) =>
            (message.value as ExportableFunction)(...args)) as T);
          break;
        default:
          resolve(message.value as T);
      }
    });

    channel.external.postMessage(
      encode({
        channel,
        message: { id, scope, source: MESSAGE_SOURCE, type: MessageType.Ping },
      })
    );

    channel.external.postMessage(encode({ channel, message }));
  });
}

function createProxy<T>({
  channel,
  path = [],
}: {
  channel: Channel;
  path?: ObjectPath;
}): Remote<T> {
  return new Proxy((() => {}) as Remote<T>, {
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
    get(target, prop, receiver) {
      switch (prop) {
        case "apply":
        case "call": {
          return Reflect.get(target, prop, receiver);
        }
        case "then": {
          const promise = awaitResponse({
            channel,
            message: {
              id: generateId(),
              path,
              scope: channel.scope,
              source: MESSAGE_SOURCE,
              type: MessageType.Get,
            },
          });

          return promise.then.bind(promise);
        }
        case Symbol.iterator:
          return function* () {
            for (let index = 0; true; index += 1) {
              yield createProxy({
                channel,
                path: [...path, index.toString()],
              });
            }
          };
        default:
          return createProxy({ channel, path: [...path, prop.toString()] });
      }
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
