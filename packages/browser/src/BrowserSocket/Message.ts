import * as JsObject from "@daniel-nagy/transporter/JsObject";
import * as StructuredCloneable from "../StructuredCloneable.js";

export enum Type {
  Connect = "Connect",
  Connected = "Connected",
  Disconnect = "Disconnect",
  Disconnected = "Disconnected",
  Ping = "Ping",
  Pong = "Pong"
}

export type Connect = {
  address: string;
  type: Type.Connect;
};

/**
 * Creates a new `Connect` message.
 */
export const Connect = (address: string = ""): Connect => ({
  address,
  type: Type.Connect
});

export type Connected = {
  type: Type.Connected;
};

/**
 * Creates a new `Connected` message.
 */
export const Connected = (): Connected => ({
  type: Type.Connected
});

export type Disconnect = {
  type: Type.Disconnect;
};

/**
 * Creates a new `Disconnect` message.
 */
export const Disconnect = (): Disconnect => ({
  type: Type.Disconnect
});

export type Disconnected = {
  type: Type.Disconnected;
};

/**
 * Creates a new `Disconnected` message.
 */
export const Disconnected = (): Disconnected => ({
  type: Type.Disconnected
});

export type Ping = {
  id: string;
  type: Type.Ping;
};

/**
 * Creates a new `Ping` message.
 */
export const Ping = ({
  id = crypto.randomUUID()
}: { id?: string } = {}): Ping => ({
  id,
  type: Type.Ping
});

export type Pong = {
  id: string;
  type: Type.Pong;
};

/**
 * Creates a new `Pong` message.
 */
export const Pong = ({ id }: { id: string }): Pong => ({
  id,
  type: Type.Pong
});

/**
 * A variant type for the different types of messages a socket may send.
 */
export type Message =
  | Connect
  | Connected
  | Disconnect
  | Disconnected
  | Ping
  | Pong;

export type { Message as t };

/**
 * Returns `true` if the message is a socket message.
 */
export function isMessage(message: StructuredCloneable.t): message is Message {
  return (
    isType(message, Type.Connect) ||
    isType(message, Type.Connected) ||
    isType(message, Type.Disconnect) ||
    isType(message, Type.Disconnected) ||
    isType(message, Type.Ping) ||
    isType(message, Type.Pong)
  );
}

/**
 * Returns `true` if the message is of the specified type, allowing its type to
 * be narrowed.
 */
export function isType<T extends Type>(
  message: StructuredCloneable.t,
  type: T
): message is {
  [Type.Connect]: Connect;
  [Type.Connected]: Connected;
  [Type.Disconnect]: Disconnect;
  [Type.Disconnected]: Disconnected;
  [Type.Ping]: Ping;
  [Type.Pong]: Pong;
}[T] {
  return (
    JsObject.isObject(message) &&
    JsObject.has(message, "type") &&
    message.type === type
  );
}

/**
 * Returns the type of the message or `null` if the message is not a socket
 * message.
 */
export function typeOf(message: StructuredCloneable.t): Type | null {
  switch (true) {
    case isType(message, Type.Connect):
      return Type.Connect;
    case isType(message, Type.Connected):
      return Type.Connected;
    case isType(message, Type.Disconnect):
      return Type.Disconnect;
    case isType(message, Type.Disconnected):
      return Type.Disconnected;
    case isType(message, Type.Ping):
      return Type.Ping;
    case isType(message, Type.Pong):
      return Type.Pong;
    default:
      return null;
  }
}
