import * as AddressBook from "@daniel-nagy/transporter/AddressBook.js";
import * as BehaviorSubject from "@daniel-nagy/transporter/BehaviorSubject.js";
import * as Observable from "@daniel-nagy/transporter/Observable/index.js";

import * as Request from "./BrowserRequest.js";
import * as Response from "./BrowserResponse.js";
import * as StructuredCloneable from "./StructuredCloneable.js";

export { BrowserServer as t };

const ADDRESS_SPACE = "BrowserServer";

declare class SharedWorkerGlobalScope extends EventTarget {}

interface ConnectEvent<T = unknown> extends MessageEvent<T> {
  ports: [MessagePort, ...MessagePort[]];
}

export enum State {
  Listening = "Listening",
  Stopped = "Stopped"
}

/**
 * Takes a request as input and returns a response that will be sent back to the
 * client, completing the request/response cycle.
 */
export type RequestHandler = (
  request: Readonly<Request.t>
) => StructuredCloneable.t | Promise<StructuredCloneable.t>;

export type Options = {
  /**
   * The address of the server. The default is the empty string. All servers
   * must have a globally unique address.
   */
  address?: string;
  /**
   * Called whenever a request is received from a client. The request handler
   * may return anything that is structured cloneable.
   *
   * The request object will contain the origin of the client. The origin can be
   * used to validate the client before fulfilling the request.
   */
  handle: RequestHandler;
};

/**
 * Provides request/response semantics on top of `postMessage`. It also
 * normalizes the interface for connecting to different types of processes in
 * the browser.
 */
export class BrowserServer {
  /**
   * The address of the server.
   */
  public readonly address: string;
  public readonly handle: RequestHandler;

  constructor({ address = "", handle }: Options) {
    this.address = address;
    this.handle = handle;

    AddressBook.add(ADDRESS_SPACE, this.address);

    const sharedWorker = typeof SharedWorkerGlobalScope !== "undefined";

    if (sharedWorker) {
      Observable.fromEvent<ConnectEvent>(self, "connect")
        .pipe(
          Observable.map((event) => event.ports[0]),
          Observable.tap((port) => port.start())
        )
        .subscribe((port) => this.#onConnect(port));
    } else {
      this.#onConnect(self);
    }
  }

  #state = BehaviorSubject.of(State.Listening);

  /**
   * Returns the current state of the server.
   */
  get state() {
    return this.#state.getValue();
  }

  /**
   * Emits when the server's state changes. Completes after the server is
   * stopped.
   */
  readonly stateChange = this.#state.asObservable();

  /**
   * Emits when the server is stopped and then completes.
   */
  readonly stopped = this.stateChange.pipe(
    Observable.filter((state) => state === State.Stopped),
    Observable.take(1)
  );

  /**
   * Stops the server. Once stopped the server will no longer receive requests.
   */
  stop() {
    this.#state.next(State.Stopped);
    this.#state.complete();
    AddressBook.release(ADDRESS_SPACE, this.address);
  }

  #onConnect(target: MessagePort | Window | Worker | ServiceWorker) {
    Observable.fromEvent<MessageEvent<StructuredCloneable.t>>(target, "message")
      .pipe(
        Observable.takeUntil(this.stopped),
        Observable.filter(
          (message): message is MessageEvent<Request.t> =>
            Request.isRequest(message) && message.data.address === this.address
        )
      )
      .subscribe(async (message) => {
        const messageSink = message.source ?? target;
        const request = { ...message.data, origin: message.origin };

        messageSink.postMessage(
          Response.t({
            body: await this.handle(request),
            id: message.data.id
          }),
          { targetOrigin: "*" }
        );
      });
  }

  [Symbol.dispose]() {
    if (this.state === State.Listening) this.stop();
  }
}

/**
 * Creates a new `BrowserServer`.
 *
 * @throws {UniqueAddressError} If the address is already taken.
 *
 * @example
 *
 * const server = BrowserServer.listen({
 *   handle(request) {
 *     // Message received from client. Return any response.
 *     return "👋";
 *   }
 * });
 */
export function listen(options: Options) {
  return new BrowserServer(options);
}
