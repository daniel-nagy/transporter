import { BufferOverflowError } from "@daniel-nagy/transporter/Observable";

export class ConnectTimeoutError extends Error {
  readonly name = "ConnectTimeoutError";
}

export class DisconnectTimeoutError extends Error {
  readonly name = "DisconnectTimeoutError";
}

export class HeartbeatTimeoutError extends Error {
  readonly name = "HeartbeatTimeoutError";
}

/**
 * A variant type for the different reasons a socket may transition to a closing
 * state with an error.
 */
export type ConnectionError =
  | BufferOverflowError
  | ConnectTimeoutError
  | HeartbeatTimeoutError;
