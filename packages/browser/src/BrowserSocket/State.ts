import * as Error from "./Error.js";

export enum Type {
  Connecting = "Connecting",
  Connected = "Connected",
  Closing = "Closing",
  Closed = "Closed"
}

export type Connecting = {
  type: Type.Connecting;
};

/**
 * Creates a new `Connecting` state.
 */
export const Connecting = (): Connecting => ({
  type: Type.Connecting
});

export type Connected = {
  type: Type.Connected;
};

/**
 * Creates a new `Connected` state.
 */
export const Connected = (): Connected => ({
  type: Type.Connected
});

export type Closing<E> = {
  error?: E;
  type: Type.Closing;
};

/**
 * Creates a new `Closing` state.
 */
export const Closing = <E = never>(error?: E): Closing<E> => ({
  error,
  type: Type.Closing
});

export type Closed<E> = {
  error?: E;
  type: Type.Closed;
};

/**
 * Creates a new `Closed` state.
 */
export const Closed = <E = never>(error?: E): Closed<E> => ({
  error,
  type: Type.Closed
});

/*
 * ┌───────────────────────┐
 * │ State.Connecting      ├───────────┐
 * └───────────┬───────────┘           │ BufferOverflowError
 *             │ Message.Connected     │ ConnectTimeoutError
 * ┌───────────▼───────────┐           │ close(error?)
 * │ State.Connected       │           │ Symbol.dispose
 * └───────────┬───────────┘           │
 *             │ Message.Disconnect    │
 *             │ HeartbeatTimeoutError │
 *             │ close(error?)         │
 *             │ Symbol.dispose        │
 * ┌───────────▼────────────┐          │
 * │ State.Closing(error?)  ◄──────────┘
 * └───────────┬────────────┘
 *             │ Message.Disconnected
 *             │ DisconnectTimeoutError
 * ┌───────────▼────────────┐
 * │ State.Closed(error?)   │
 * └────────────────────────┘
 */

/**
 * A variant type describing the state of a socket.
 *
 * A socket starts in a connecting state. From a connecting state the socket may
 * transition to a connected state, either synchronously or asynchronously, or
 * to a closing state if there is an error connecting. From a closing state a
 * socket will transition to a closed state, either synchronously or
 * asynchronously. The closed state is a terminal state.
 */
export type State =
  | Connecting
  | Connected
  | Closing<Error.ConnectionError>
  | Closed<Error.DisconnectTimeoutError>;
