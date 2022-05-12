import { createRegistry } from "./FinalizationRegistry";

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
  readonly source: "transporter";
  readonly type: MessageType;
}

interface ICallFunctionMessage extends IMessage {
  readonly args: Exposable[];
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
  readonly value: Exposable;
}

type Channel = {
  readonly external: ExternalMessageTarget;
  readonly internal: InternalMessageTarget;
  readonly scope: string | null;
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
type MessageSubscriber = (event: { data: string }) => void;
type ObjectPath = string[];
type Promisify<T> = [T] extends Promise<unknown> ? T : Promise<T>;
type Nothing = undefined | null;
type UnknownArray = unknown[];
type UnknownObject = { [key: string]: unknown };

// Type issue: Only terminals will be wrapped in a Promise. This is incorrect,
// whatever is dereferenced will be wrapped in a Promise. I'm not sure this can
// be statically typed.
export type Remote<T> = T extends Nothing
  ? Promise<T>
  : T extends UnknownArray | UnknownObject
  ? { [key in keyof T]: Remote<T[key]> }
  : T extends AnyFunction
  ? Proxied<T>
  : Promisify<T>;

export type Proxied<T> = T extends (...args: infer A) => infer R
  ? (...args: Exposed<A>) => Promisify<Exposed<R>>
  : never;

export type Exposed<T> = T extends UnknownObject
  ? { [key in keyof T]: Exposed<T[key]> }
  : T extends AnyFunction
  ? Proxied<T>
  : T;

export type Exposable =
  | boolean
  | null
  | number
  | string
  | void
  | Exposable[]
  | ExposableFunction
  | ExposableObject;

// It would be good if we can find a way to restrict these arguments to type
// Transferable[]
export type ExposableFunction = (
  ...args: any[]
) => Exposable | Promise<Exposable>;
export type ExposableObject = { [key: string]: Exposable };

export const messageSource = "transporter";

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
        source: messageSource,
        type: MessageType.GarbageCollect,
      },
    })
  );
});

function awaitResponse<T>({
  channel,
  message,
  timeout = 1000,
}: {
  channel: Channel;
  message: Message;
  timeout?: number;
}): Promise<T> {
  return new Promise((resolve, reject) => {
    const { id, scope } = message;
    const { cancel } = schedule(timeout, () =>
      reject(new TimeoutError("A signal was not received in the allowed time"))
    );

    channel.internal.addEventListener("message", function onMessage({ data }) {
      const message = decode({ channel, message: data });

      if (!isMessage(message) || message.id !== id || message.scope !== scope)
        return;

      if (message.type === MessageType.Pong) cancel();
      if (message.type !== MessageType.Set) return;

      channel.internal.removeEventListener("message", onMessage);

      switch (typeof message.value) {
        case "function":
          // Wrap the function to prevent `resolve` from calling `then` on the
          // proxied value which will cause an infinite loop.
          resolve(((...args: Exposable[]) =>
            (message.value as ExposableFunction)(...args)) as unknown as T);
          break;
        default:
          resolve(message.value as unknown as T);
      }
    });

    channel.external.postMessage(
      encode({
        channel,
        message: { id, scope, source: messageSource, type: MessageType.Ping },
      })
    );

    channel.external.postMessage(encode({ channel, message }));
  });
}

export function createProxy<T>(
  {
    from: external,
    scope = null,
    timeout,
    to: internal = self,
  }: {
    from: ExternalMessageTarget;
    scope?: string | null;
    timeout?: number;
    to?: InternalMessageTarget;
  },
  path: ObjectPath = []
): Remote<T> {
  const channel = { external, internal, scope };

  return new Proxy((() => {}) as Remote<T>, {
    apply(_target, _thisArg, args) {
      return awaitResponse({
        channel,
        message: {
          args,
          id: generateId(),
          path,
          scope: channel.scope,
          source: messageSource,
          type: MessageType.Call,
        },
        timeout,
      });
    },
    get(_target, prop) {
      if (typeof prop === "symbol")
        throw new Error("symbols are not implemented");

      switch (prop) {
        case "then": {
          const promise = awaitResponse({
            channel,
            message: {
              id: generateId(),
              path,
              scope: channel.scope,
              source: messageSource,
              type: MessageType.Get,
            },
            timeout,
          });

          return promise.then.bind(promise);
        }
        default:
          return createProxy({ from: external, scope, timeout, to: internal }, [
            ...path,
            prop,
          ]);
      }
    },
  });
}

function decode({ channel, message }: { channel: Channel; message: string }) {
  try {
    return JSON.parse(message, (_key, value) => {
      switch (true) {
        case isEncodedFunction(value): {
          const proxy = createProxy({
            from: channel.external,
            to: channel.internal,
            scope: value.scope,
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
  } catch {
    return null;
  }
}

function encode({ channel, message }: { channel: Channel; message: Message }) {
  return JSON.stringify(message, (_key, value) => {
    switch (typeof value) {
      case "function": {
        const scope = generateId();
        expose({ from: channel.internal, to: channel.external, scope, value });
        return { scope, type: "function" };
      }
      case "undefined":
        return { type: "undefined" };
      default:
        return value;
    }
  });
}

export function expose<T extends Exposable>({
  from: internal = self,
  scope = null,
  to: external,
  value,
}: {
  from?: InternalMessageTarget;
  scope?: string | null;
  to: ExternalMessageTarget;
  value: T;
}): { stop(): void } {
  const channel = { external, internal, scope };
  const stop = () => internal.removeEventListener("message", onMessage);

  async function onMessage({ data }: { data: string }) {
    const message = decode({ channel, message: data });

    if (!isMessage(message) || message.scope !== scope) return;

    switch (message.type) {
      case MessageType.Call:
        external.postMessage(
          encode({
            channel,
            message: {
              id: message.id,
              scope,
              source: messageSource,
              type: MessageType.Set,
              value: await (getIn(value, message.path) as ExposableFunction)(
                ...message.args
              ),
            },
          })
        );
        break;
      case MessageType.GarbageCollect:
        stop();
        break;
      case MessageType.Get:
        external.postMessage(
          encode({
            channel,
            message: {
              id: message.id,
              scope,
              source: messageSource,
              type: MessageType.Set,
              value: getIn(value, message.path) as Exposable,
            },
          })
        );
        break;
      case MessageType.Ping:
        external.postMessage(
          encode({
            channel,
            message: {
              id: message.id,
              scope,
              source: messageSource,
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

  return { stop };
}

function generateId(): string {
  return Math.random().toString(36).slice(2, 11);
}

function getIn<T>(value: T, [prop, ...path]: ObjectPath): unknown {
  if (!prop) return value;
  if (isObject(value)) return getIn(value[prop], path);
  return undefined;
}

function isEncodedFunction(value: unknown): value is EncodedFunction {
  return isObject(value) && value.type === "function";
}

function isEncodedUndefined(value: unknown): value is EncodedUndefined {
  return isObject(value) && value.type === "undefined";
}

function isMessage(message: unknown): message is Message {
  return isObject(message) && message.source === messageSource;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function schedule(time: number, callback: () => void): { cancel(): void } {
  const id = setTimeout(callback, time);
  return { cancel: () => clearTimeout(id) };
}
