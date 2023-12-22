import * as JsFunction from "../JsFunction.js";

/**
 * The type of connection between the server and the client.
 */
export enum ConnectionMode {
  /**
   * No dedicated connection is established. For example, HTTP is a
   * connectionless protocol.
   */
  Connectionless = "Connectionless",
  /**
   * A dedicated connection is established. For example, TCP is a
   * connection-oriented protocol.
   */
  ConnectionOriented = "ConnectionOriented"
}

/**
 * How data is distributed to nodes in a network.
 */
export enum OperationMode {
  /**
   * A single message is sent to every node in a network. This is a one-to-all
   * transmission.
   */
  Broadcast = "Broadcast",
  /**
   * A single message is sent to a subset of nodes in a network. This is a
   * one-to-many transmission.
   */
  Multicast = "Multicast",
  /**
   * A single message is sent to a single node. This is a one-to-one
   * transmission.
   */
  Unicast = "Unicast"
}

/**
 * How data is transmitted over a network.
 */
export enum TransmissionMode {
  /**
   * Either side may transmit data at any time. This is a 2-way communication.
   */
  Duplex = "Duplex",
  /**
   * Only one side can transmit data at a time. This is a 2-way communication.
   */
  HalfDuplex = "HalfDuplex",
  /**
   * Only the sender can transmit data. This is a 1-way communication.
   */
  Simplex = "Simplex"
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface Protocol<T> {}

/**
 * A container type for a subprotocol. This exists as a workaround to the
 * absence of partial type inference in TypeScript.
 */
export const Protocol = <const T>(): Protocol<T> => ({});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface Subprotocol<Protocol, in Input = unknown, in Output = unknown> {
  connectionMode: ConnectionMode;
  operationMode: OperationMode;
  transmissionMode: TransmissionMode;
}

export type { Subprotocol as t };

/**
 * The Transporter protocol is type agnostic. In order to provide type-safety a
 * subprotocol is required. The subprotocol restricts what types may be included
 * in function IO. For example, if the subprotocol is JSON then only JSON data
 * types may be input or output from remote functions.
 *
 * In addition, Transporter can perform recursive RPC if certain subprotocol and
 * network conditions are met. Recursive RPC means functions or proxies may be
 * included in function IO. This is an interesting concept because it allows
 * state between processes to be held on the call stack. For example, recursive
 * RPC allows Observables to be used for pub-sub.
 *
 * In order to use recursive RPC your subprotocol must be connection-oriented,
 * bidirectional, and unicast. If those conditions are met then the call
 * signature for remote functions will allow functions or proxies as input or
 * output. It turns out that these types of connections are common in the
 * browser, making the application of Transporter in the browser especially
 * interesting.
 */
const Subprotocol = <
  const SubProtocol,
  const Connection extends ConnectionMode,
  const Operation extends OperationMode,
  const Transmission extends TransmissionMode
>({
  connectionMode,
  operationMode,
  protocol: _protocol,
  transmissionMode
}: {
  connectionMode: Connection;
  operationMode: Operation;
  protocol: Protocol<SubProtocol>;
  transmissionMode: Transmission;
}): Subprotocol<
  SubProtocol,
  Io<SubProtocol, Connection, Operation, Transmission>,
  "yes" extends Bidirectional<Operation, Transmission>
    ? Promise<Io<SubProtocol, Connection, Operation, Transmission>>
    : void
> => ({ connectionMode, operationMode, transmissionMode });

/**
 * Creates a new `SubProtocol`.
 */
export const init = Subprotocol;

/**
 * Returns `true` if the protocol is bidirectional. A protocol is not
 * bidirectional if its operation mode is broadcast or multicast, or if its
 * transmission mode is simplex.
 */
export function isBidirectional(protocol: Subprotocol<unknown>): boolean {
  switch (true) {
    case protocol.operationMode === OperationMode.Broadcast:
    case protocol.operationMode === OperationMode.Multicast:
    case protocol.transmissionMode === TransmissionMode.Simplex:
      return false;
    default:
      return true;
  }
}

/**
 * Produces type `"yes"` if the protocol is bidirectional or type `"no"` if it
 * is not bidirectional. If the connection is not bidirectional then procedures
 * must return `void`.
 */
type Bidirectional<
  Operation extends OperationMode,
  Transmission extends TransmissionMode
> = Operation extends OperationMode.Broadcast | OperationMode.Multicast
  ? "no"
  : Transmission extends TransmissionMode.Simplex
    ? "no"
    : "yes";

/**
 * Defines a procedure who's arguments are both covariant and contravariant.
 */
type Procedure<T> = JsFunction.Bivariant<
  (...args: RecursiveIo<T>[]) => Promise<RecursiveIo<T>>
>;

// Resolution of interface base types and interface members is deferred, whereas
// resolution of type aliases is performed eagerly.
// @see https://github.com/microsoft/TypeScript/issues/3496#issuecomment-128553540
interface IoArray<T> extends Array<RecursiveIo<T>> {}

interface IoMapKV<T1, T2> extends Map<RecursiveIo<T1>, RecursiveIo<T2>> {}

interface IoMapK<T1, T2> extends Map<RecursiveIo<T1>, T2> {}

interface IoMapV<T1, T2> extends Map<T1, RecursiveIo<T2>> {}

interface IoRecord<T> extends Record<string, RecursiveIo<T>> {}

interface IoSet<T> extends Set<RecursiveIo<T>> {}

/**
 * Let `T` be the subprotocol. Recursively maps `T` to allow functions or
 * proxies as input and output.
 *
 * Note that this mapping only works for built in JavaScript types, such as
 * arrays, records (plain objects), sets, and maps. Therefore, if you have
 * custom container types, those types will not be mapped over to allow
 * recursive RPC. For example, if you had a `Tree<T>` type Transporter would not
 * know how to map over that type.
 *
 * Support for custom container types may be possible using a concept similar to
 * type classes in fp-ts. However, when I attempted this the TypeScript compiler
 * complained about excessive recursion (though the type checking did worked).
 */
type RecursiveIo<T> =
  | (T extends Set<infer U>
      ? T extends U // checking for recursion
        ? IoSet<U>
        : Set<U>
      : T extends Map<infer T1, infer T2>
        ? T extends T1 // checking for recursion
          ? T extends T2
            ? IoMapKV<T1, T2>
            : IoMapK<T1, T2>
          : T extends T2
            ? IoMapV<T1, T2>
            : Map<T1, T2>
        : T extends Array<infer U>
          ? T extends U // checking for recursion
            ? IoArray<U>
            : Array<U>
          : T extends Record<string, infer U>
            ? T extends U // checking for recursion
              ? IoRecord<U>
              : Record<string, U>
            : T)
  | Procedure<T>;

/**
 * Uses information about the subprotocol to determine if recursive RPC should
 * be enabled or not.
 */
type Io<
  T,
  Connection extends ConnectionMode,
  Operation extends OperationMode,
  Transmission extends TransmissionMode
> = Connection extends ConnectionMode.ConnectionOriented
  ? Operation extends OperationMode.Unicast
    ? Transmission extends TransmissionMode.Duplex | TransmissionMode.HalfDuplex
      ? RecursiveIo<T>
      : T
    : T
  : T;
