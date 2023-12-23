import * as JsObject from "./JsObject.js";

import t = Message.t;
export type { t };

/**
 * Flattens an intersection type into a single type. Taken from type-fest.
 */
type Simplify<T> = { [K in keyof T]: T[K] };

/**
 * The name of the Transporter protocol is the constant "transporter".
 */
export const protocol = "transporter";

/**
 * The current version of Transporter in semantic versioning. Different versions
 * of Transporter are considered compatible if they have the same major and
 * minor version. Therefore, a server and a client can use different patch
 * versions of transporter.
 *
 * If Transporter receives a message with an incompatible version a warning will
 * be logged to the console. This should hopefully surface any conflicts during
 * development.
 *
 * It is ok for multiple versions of Transporter to exist at runtime as long as
 * clients are using a version compatible with the server they are trying to
 * connect to. For example, a 3rd party dependency could use a different major
 * or minor version of Transporter as long as its servers and clients are using
 * a compatible version.
 */
export const version: Version = "1.0.0";

/**
 * Transporter may send messages with any of these types.
 */
export enum Type {
  Call = "Call",
  Error = "Error",
  GarbageCollect = "GarbageCollect",
  Set = "Set"
}

/**
 * A semantic version string.
 */
export type Version = `${number}.${number}.${number}`;

namespace Message {
  /**
   * A discriminated union of the different types of messages.
   *
   * While the creation and interpretation of these messages should be
   * considered internal, it is ok to intercept these messages and perform your
   * own encoding on them. By doing so you can create your own protocol stack.
   */
  export type t<Value = unknown> =
    | CallFunction<Value[]>
    | Error<Value>
    | GarbageCollect
    | SetValue<Value>;
}

/**
 * All messages sent by Transporter have this shape.
 *
 * Using a type instead of an interface is intentional as a type is a subtype of
 * a type with an index signature but an interface is not. This allows a message
 * to be passed to an encoder of a subprotocol type, with an index signature,
 * without type errors.
 */
export type Message = {
  readonly address: string;
  readonly id: string;
  readonly protocol: typeof protocol;
  readonly type: Type;
  readonly version: Version;
};

export type CallFunction<Args> = Simplify<
  Message & {
    readonly args: Args;
    readonly path: string[];
    readonly noReply: boolean;
    readonly type: Type.Call;
  }
>;

/**
 * Creates a message to call a remote function.
 */
export const CallFunction = <Args>({
  address,
  args,
  id = crypto.randomUUID(),
  noReply = false,
  path
}: {
  address: string;
  args: Args;
  id?: string;
  noReply?: boolean;
  path: string[];
}): CallFunction<Args> => ({
  address,
  args,
  id,
  noReply,
  path,
  protocol,
  type: Type.Call,
  version
});

export type Error<Error> = Simplify<
  Message & {
    readonly error: Error;
    readonly type: Type.Error;
  }
>;

/**
 * The server may respond with an error when calling a function.
 */
export const Error = <T>({
  address,
  error,
  id = crypto.randomUUID()
}: {
  address: string;
  error: T;
  id?: string;
}): Error<T> => ({
  address,
  error,
  id,
  protocol,
  type: Type.Error,
  version
});

export type GarbageCollect = Simplify<
  Message & {
    readonly type: Type.GarbageCollect;
  }
>;

/**
 * Sent by a client to a server when a proxy is disposed.
 */
export const GarbageCollect = ({
  address,
  id = crypto.randomUUID()
}: {
  address: string;
  id?: string;
}): GarbageCollect => ({
  address,
  id,
  protocol,
  type: Type.GarbageCollect,
  version
});

export type SetValue<Value> = Simplify<
  Message & {
    readonly type: Type.Set;
    readonly value: Value;
  }
>;

/**
 * The server responds with a Set message if calling a function is successful.
 */
export const SetValue = <T>({
  address,
  id = crypto.randomUUID(),
  value
}: {
  address: string;
  id?: string;
  urn?: string;
  value: T;
}): SetValue<T> => ({
  address,
  id,
  protocol,
  type: Type.Set,
  value,
  version
});

/**
 * Returns `true` if the message is a Transporter message.
 */
export function isMessage<T, Value>(
  message: T | Message.t<Value>
): message is Message.t<Value> {
  return (
    JsObject.isObject(message) &&
    JsObject.has(message, "protocol") &&
    message.protocol === protocol
  );
}

/**
 * Checks if a message is compatible with the current version of Transporter.
 */
export function isCompatible(messageVersion: Version): boolean {
  const [messageMajor, messageMinor] = parseVersion(messageVersion);
  const [major, minor] = parseVersion(version);
  return messageMajor === major && messageMinor == minor;
}

/**
 * Returns the major, minor, and patch version of a semantic version string.
 */
export function parseVersion(
  version: Version
): [major: string, minor: string, patch: string] {
  return version.split(".") as [string, string, string];
}
