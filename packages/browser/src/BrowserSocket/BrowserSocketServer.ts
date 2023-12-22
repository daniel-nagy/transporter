import {
  BehaviorSubject,
  Observable,
  Subject,
  filter,
  flatMap,
  fromEvent,
  map,
  take,
  takeUntil,
  tap
} from "@daniel-nagy/transporter/Observable";
import * as AddressBook from "@daniel-nagy/transporter/Protocol/AddressBook";

const ADDRESS_SPACE = "BrowserSocketServer";

import * as BrowserSocket from "./BrowserSocket.js";
import * as Message from "./Message.js";
import * as StructuredCloneable from "../StructuredCloneable.js";

export { BrowserSocketServer as t };

declare class SharedWorkerGlobalScope extends EventTarget {}

interface ConnectEvent<T = unknown> extends MessageEvent<T> {
  ports: [MessagePort, ...MessagePort[]];
}

export enum State {
  Listening = "Listening",
  Stopped = "Stopped"
}

export type SocketOptions = {
  disconnectTimeout?: number;
  heartbeatInterval?: number;
  heartbeatTimeout?: number;
};

export type SocketServerOptions = {
  /**
   * The address of the server. The default is an empty string.
   */
  address?: string;
  /**
   * Allows intercepting connection requests and denying the request if
   * necessary.
   */
  connectFilter?(message: MessageEvent<Message.Connect>): boolean;
  /**
   * Forwarded to the socket that is created on connection.
   * See {@link BrowserSocket.SocketOptions}.
   */
  socketOptions?: SocketOptions;
};

/**
 * A `BrowserSocketServer` listens for incoming connection requests and creates
 * a socket to communicate with a client.
 */
export class BrowserSocketServer {
  constructor({
    address = "",
    connectFilter = () => true,
    receive,
    socketOptions
  }: {
    address?: string;
    connectFilter?(message: ConnectEvent<Message.Connect>): boolean;
    receive: Observable<MessageEvent<StructuredCloneable.t>>;
    socketOptions?: SocketOptions;
  }) {
    this.address = address;

    AddressBook.add(ADDRESS_SPACE, this.address);

    receive
      .pipe(
        takeUntil(this.stopped),
        filter(
          (message): message is ConnectEvent<Message.Connect> =>
            Message.isType(message.data, Message.Type.Connect) &&
            message.data.address === address
        ),
        filter(connectFilter)
      )
      .subscribe((message) => this.#onConnect(message, socketOptions));
  }

  #clients: BrowserSocket.t[] = [];
  #connect = new Subject<BrowserSocket.t>();
  #state = new BehaviorSubject(State.Listening);

  /**
   * The address of the socket server.
   */
  readonly address: string;

  /**
   * Emits whenever a connection is established with a client. Completes when
   * the server is stopped.
   */
  readonly connect: Observable<BrowserSocket.t> = this.#connect.asObservable();

  /**
   * Returns the current state of the socket server.
   */
  get state() {
    return this.#state.getValue();
  }

  /**
   * Emits when the server's state changes. Completes after the socket
   * transitions to a stopped state.
   */
  readonly stateChange = this.#state.asObservable();

  /**
   * Emits when the server is stopped and then completes.
   */
  readonly stopped = this.stateChange.pipe(
    filter((state) => state === State.Stopped),
    take(1)
  );

  /**
   * Stops the server. A disconnect message will be sent to all connected
   * clients.
   */
  stop() {
    this.#state.next(State.Stopped);
    this.#connect.complete();
    this.#state.complete();
    this.#clients.forEach((client) => client.send(Message.Disconnect()));
    AddressBook.release(ADDRESS_SPACE, this.address);
  }

  #onConnect(
    message: ConnectEvent<Message.Connect>,
    socketOptions?: SocketOptions
  ) {
    const port = message.ports[0];
    const socket = BrowserSocket.fromPort(port, socketOptions);

    this.#clients.push(socket);
    this.#connect.next(socket);

    socket.closed.subscribe(() => {
      this.#clients = this.#clients.filter((client) => client !== socket);
    });

    socket.send(Message.Connected());
  }

  [Symbol.dispose]() {
    if (this.state === State.Listening) this.stop();
  }
}

/**
 * Creates a new `SocketServer` in the current browsing context or worker context.
 *
 * @example
 *
 * const socketServer = BrowserSocketServer.listen();
 *
 * socketServer.connect.subscribe(socket => socket.send("👋"));
 */
export function listen(options?: SocketServerOptions) {
  const sharedWorker = typeof SharedWorkerGlobalScope !== "undefined";

  if (sharedWorker) {
    return new BrowserSocketServer({
      ...options,
      receive: fromEvent<ConnectEvent>(self, "connect").pipe(
        map((event) => event.ports[0]),
        tap((port) => port.start()),
        flatMap((port) => fromEvent(port, "message"))
      )
    });
  }

  return new BrowserSocketServer({
    ...options,
    receive: fromEvent<MessageEvent<StructuredCloneable.t>>(self, "message")
  });
}
