import {
  type Observer,
  ObservableState,
  Subject,
  fromEvent,
  map
} from "@daniel-nagy/transporter/Observable";
import * as Session from "@daniel-nagy/transporter/Protocol/Session";
import * as Subprotocol from "@daniel-nagy/transporter/Protocol/Subprotocol";

import * as StructuredCloneable from "./StructuredCloneable";

const protocol = Subprotocol.init({
  connectionMode: Subprotocol.ConnectionMode.Connectionless,
  operationMode: Subprotocol.OperationMode.Broadcast,
  protocol: Subprotocol.Protocol<StructuredCloneable.t>(),
  transmissionMode: Subprotocol.TransmissionMode.Simplex
});

/**
 * A `BroadcastSubject` can be used to synchronize state between same-origin
 * browsing contexts or workers.
 *
 * @example
 *
 * const darkMode = new BroadcastSubject("darkMode");
 *
 * darkMode.subscribe(value => console.log(value));
 */
export class BroadcastSubject<
  T extends StructuredCloneable.t
> extends Subject<T> {
  constructor(public readonly name: string) {
    super();

    const observer = {
      complete: () => this.#complete(),
      error: (error: StructuredCloneable.t) => this.#error(error),
      next: (value: T) => this.#next(value)
    };

    const resource = Session.Resource<typeof observer>();

    this.#client = Session.client({ protocol, resource });
    this.#proxy = this.#client.createProxy();
    this.#receiver = new BroadcastChannel(name);
    this.#server = Session.server({ protocol, provide: observer });
    this.#transmitter = new BroadcastChannel(name);

    fromEvent<MessageEvent>(this.#receiver, "message")
      .pipe(map((message) => message.data))
      .subscribe(this.#server.input);

    this.#client.output.subscribe((message) =>
      this.#transmitter.postMessage(message)
    );
  }

  #client: Session.ClientSession<StructuredCloneable.t, Required<Observer<T>>>;
  #proxy: Required<Observer<T>>;
  #receiver: BroadcastChannel;
  #server: Session.ServerSession<StructuredCloneable.t, Required<Observer<T>>>;
  #transmitter: BroadcastChannel;

  complete() {
    if (this.state === ObservableState.NotComplete) this.#proxy.complete();
    this.#complete();
  }

  error(error: unknown) {
    if (this.state === ObservableState.NotComplete) this.#proxy.error(error);
    this.#error(error);
  }

  next(value: T) {
    if (this.state === ObservableState.NotComplete) this.#proxy.next(value);
    this.#next(value);
  }

  #complete() {
    this.#dispose();
    super.complete();
  }

  #dispose() {
    this.#client.terminate();
    this.#receiver.close();
    this.#server.terminate();
    this.#transmitter.close();
  }

  #error(error: unknown) {
    this.#dispose();
    super.error(error);
  }

  #next(value: T) {
    super.next(value);
  }
}
