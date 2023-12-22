import {
  BehaviorSubject,
  BufferOverflowError,
  BufferOverflowStrategy,
  Observable,
  Subject,
  bufferUntil,
  cron,
  fail,
  filter,
  firstValueFrom,
  fromEvent,
  map,
  take,
  takeUntil,
  timeout as within
} from "@daniel-nagy/transporter/Observable";

import * as Error from "./Error.js";
import * as Message from "./Message.js";
import * as State from "./State.js";
import * as StructuredCloneable from "../StructuredCloneable.js";

export { BrowserSocket as t };

export interface SocketOptions {
  /**
   * The maximum number of messages to buffer before the socket is connected.
   * The default is `Infinity`.
   */
  bufferLimit?: number;
  /**
   * What to do incase there is a buffer overflow. The default is to error.
   */
  bufferOverflowStrategy?: BufferOverflowStrategy;
  /**
   * The maximum amount of time to wait for a connection in milliseconds. The
   * default is `2000` or 2 seconds.
   */
  connectTimeout?: number;
  /**
   * The maximum amount of time to wait for a disconnection in milliseconds. The
   * default is `2000` or 2 seconds.
   */
  disconnectTimeout?: number;
  /**
   * The frequency at which to request heartbeats in milliseconds. The default
   * is `1000` or 1 second.
   */
  heartbeatInterval?: number;
  /**
   * The maximum amount of time to wait for a heartbeat in milliseconds. The
   * default is `2000` or 2 seconds.
   */
  heartbeatTimeout?: number;
  /**
   * The address of the socket server.
   */
  serverAddress?: string;
}

export interface PortSocketOptions extends SocketOptions {
  /**
   * When creating a socket from a `MessagePort` you may specify if the socket
   * is connected, bypassing the handshake and synchronously transitioning the
   * socket to a connected state. The default is `true`.
   */
  connected?: boolean;
}

export interface WindowSocketOptions extends SocketOptions {
  /**
   * When connecting to a `Window` you may specify the allowed origin. If the
   * window and the origin do not match the connection will fail. The origin is
   * passed directly to the `targetOrigin` parameter of `postMessage` when
   * connecting to the window. The default is `"*"`, which allows any origin.
   */
  origin?: string;
}

/**
 * A `BrowserSocket` is a connection between browsing contexts or a browsing
 * context and a worker context.
 *
 * A socket is connection-oriented, duplex, and unicast. Any data that is
 * structured cloneable can be passed through a browser socket.
 */
export class BrowserSocket {
  constructor({
    bufferLimit = Infinity,
    bufferOverflowStrategy = BufferOverflowStrategy.Error,
    connectTimeout = 2000,
    disconnectTimeout = 2000,
    heartbeatInterval = 1000,
    heartbeatTimeout = 2000,
    receive,
    send
  }: {
    bufferLimit?: number;
    bufferOverflowStrategy?: BufferOverflowStrategy;
    connectTimeout?: number;
    disconnectTimeout?: number;
    heartbeatInterval?: number;
    heartbeatTimeout?: number;
    receive: Observable<MessageEvent<StructuredCloneable.t>>;
    send(message: StructuredCloneable.t): void;
  }) {
    this.connected = this.stateChange.pipe(
      filter((state) => state.type === State.Type.Connected),
      takeUntil(this.closing),
      within(connectTimeout, () => fail(new Error.ConnectTimeoutError())),
      take(1)
    );

    this.receive = receive.pipe(
      map((message) => message.data),
      filter((message) => !Message.isMessage(message)),
      takeUntil(this.closing)
    );

    this.#disconnectTimeout = disconnectTimeout;

    this.#receive = receive.pipe(
      map((message) => message.data),
      filter((message) => Message.isMessage(message)),
      takeUntil(this.closed)
    );

    this.#send
      .asObservable()
      .pipe(
        bufferUntil(this.connected, {
          limit: bufferLimit,
          overflowStrategy: bufferOverflowStrategy
        })
      )
      .subscribe({
        error: (error: BufferOverflowError | Error.ConnectTimeoutError) =>
          this.#close(error),
        next: (message) => send(message)
      });

    this.connected.subscribe(() => {
      cron(heartbeatInterval, () => this.ping(heartbeatTimeout))
        .pipe(takeUntil(this.closing))
        .subscribe({
          error: () => this.#close(new Error.HeartbeatTimeoutError())
        });
    });

    this.#receive.subscribe((message) => {
      switch (true) {
        case Message.isType(message, Message.Type.Connected):
          this.#onConnected();
          break;
        case Message.isType(message, Message.Type.Disconnect): {
          this.#onDisconnect();
          break;
        }
        case Message.isType(message, Message.Type.Disconnected):
          this.#onDisconnected();
          break;
        case Message.isType(message, Message.Type.Ping):
          this.#onPing(message);
          break;
      }
    });
  }

  #disconnectTimeout: number;
  #receive: Observable<Message.Message>;
  #send = new Subject<StructuredCloneable.t>();
  #state = new BehaviorSubject<State.State>(State.Connecting());

  /**
   * Returns the current state of the socket.
   */
  get state() {
    return this.#state.getValue();
  }

  /**
   * Emits whenever the socket's state changes. Completes after the socket
   * transitions to a closed state.
   */
  readonly stateChange = this.#state.asObservable();

  /**
   * Emits when the socket transitions to a closing state and then completes.
   */
  readonly closing = this.stateChange.pipe(
    filter((state) => state.type === State.Type.Closing),
    take(1)
  );

  /**
   * Emits when the socket transitions to a closed state and then completes.
   */
  readonly closed = this.stateChange.pipe(
    filter((state) => state.type === State.Type.Closed),
    take(1)
  );

  /**
   * Emits if the socket becomes connected and then completes. If the
   * socket errors during connection it will complete without emitting.
   */
  readonly connected: Observable<State.Connected>;

  /**
   * Emits whenever the socket receives a message. Internal messages are
   * filtered from the observable stream.
   */
  readonly receive: Observable<StructuredCloneable.t>;

  /**
   * Closes the socket causing its state to transition to closing.
   */
  close() {
    this.#close();
  }

  /**
   * Sends a ping to a connected socket and waits for a pong to be sent back.
   * The default timeout for a pong is `2000` milliseconds or 2 seconds.
   *
   * @returns A promise that resolves when a pong is received or rejects if a
   * pong is not received in the allotted time.
   */
  ping(timeout: number = 2000): Promise<void> {
    const ping = Message.Ping();
    this.#send.next(ping);

    return this.#receive.pipe(
      filter(
        (message) =>
          Message.isType(message, Message.Type.Pong) && message.id === ping.id
      ),
      within(timeout),
      map(() => {}),
      firstValueFrom
    );
  }

  /**
   * Sends data through the socket.
   */
  send(message: StructuredCloneable.t) {
    if (this.state.type === State.Type.Closing && !Message.isMessage(message))
      return;

    this.#send.next(message);
  }

  #close(error?: Error.ConnectionError) {
    this.#state.next(State.Closing(error));
    this.#send.next(Message.Disconnect());

    this.closed
      .pipe(
        within(this.#disconnectTimeout, () =>
          fail(new Error.DisconnectTimeoutError())
        )
      )
      .subscribe({
        error: (error: Error.DisconnectTimeoutError) => {
          this.#onDisconnected(error);
        }
      });
  }

  #onConnected() {
    this.#state.next(State.Connected());
  }

  #onDisconnect() {
    this.#state.next(State.Closing<never>());
    this.#onDisconnected();
  }

  #onDisconnected(error?: Error.DisconnectTimeoutError) {
    this.#send.next(Message.Disconnected());
    this.#send.complete();
    this.#state.next(State.Closed(error));
    this.#state.complete();
  }

  #onPing(message: Message.Ping) {
    this.#send.next(Message.Pong({ id: message.id }));
  }

  [Symbol.dispose]() {
    switch (this.state.type) {
      case State.Type.Connecting:
      case State.Type.Connected:
        this.close();
        break;
      default:
      // no default
    }
  }
}

/**
 * Creates a new `BrowserSocket` and attempts to connect to a `Window`, a
 * `Worker`, or a `SharedWorker`.
 *
 * @example
 *
 * using socket = BrowserSocket.connect(self.parent);
 */
export function connect(
  target: Window,
  options?: WindowSocketOptions
): BrowserSocket;
export function connect(
  target: SharedWorker | Worker,
  options?: SocketOptions
): BrowserSocket;
export function connect(
  target: SharedWorker | Window | Worker,
  options?: SocketOptions | WindowSocketOptions
): BrowserSocket {
  if (target instanceof SharedWorker)
    return connectSharedWorker(target, options);

  if (target instanceof Worker) return connectWorker(target, options);

  return connectWindow(target, options);
}

/**
 * Creates a new `BrowserSocket` from a `MessagePort`. The resulting socket is
 * assumed to be connected, unless specified otherwise, bypassing the handshake
 * and transitioning the socket to a connected state synchronously.
 */
export function fromPort(
  port: MessagePort,
  { connected = true, ...options }: PortSocketOptions = {}
) {
  port.start();

  const socket = new BrowserSocket({
    ...options,
    receive: fromEvent<MessageEvent<StructuredCloneable.t>>(port, "message"),
    send: (message: StructuredCloneable.t) => port.postMessage(message)
  });

  if (connected)
    port.dispatchEvent(
      new MessageEvent("message", { data: Message.Connected() })
    );

  socket.closed.subscribe(() => port.close());

  return socket;
}

function connectSharedWorker(
  worker: SharedWorker,
  { serverAddress = "", ...options }: WindowSocketOptions = {}
) {
  const channel = new MessageChannel();
  const socket = fromPort(channel.port1, {
    ...options,
    connected: false
  });
  worker.port.start();
  worker.port.postMessage(Message.Connect(serverAddress), [channel.port2]);
  return socket;
}

function connectWindow(
  window: Window,
  { origin = "*", serverAddress = "", ...options }: WindowSocketOptions = {}
) {
  const channel = new MessageChannel();
  const socket = fromPort(channel.port1, {
    ...options,
    connected: false
  });
  window.postMessage(Message.Connect(serverAddress), origin, [channel.port2]);
  return socket;
}

function connectWorker(
  worker: Worker,
  { serverAddress = "", ...options }: WindowSocketOptions = {}
) {
  const channel = new MessageChannel();
  const socket = fromPort(channel.port1, {
    ...options,
    connected: false
  });
  worker.postMessage(Message.Connect(serverAddress), [channel.port2]);
  return socket;
}
