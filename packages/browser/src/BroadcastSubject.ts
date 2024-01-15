import * as Observable from "@daniel-nagy/transporter/Observable/index.js";
import * as Session from "@daniel-nagy/transporter/Session.js";
import * as Subject from "@daniel-nagy/transporter/Subject.js";
import * as Subprotocol from "@daniel-nagy/transporter/Subprotocol.js";

import * as StructuredCloneable from "./StructuredCloneable.js";

export { BroadcastSubject as t };

type Observer<T> = Required<Observable.Observer<T>>;

const protocol = Subprotocol.init({
  connectionMode: Subprotocol.ConnectionMode.Connectionless,
  dataType: Subprotocol.DataType<StructuredCloneable.t>(),
  operationMode: Subprotocol.OperationMode.Broadcast,
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
> extends Subject.t<T> {
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

    Observable.fromEvent<MessageEvent>(this.#receiver, "message")
      .pipe(Observable.map((message) => message.data))
      .subscribe(this.#server.input);

    this.#client.output.subscribe((message) =>
      this.#transmitter.postMessage(message)
    );
  }

  #client: Session.ClientSession<StructuredCloneable.t, Observer<T>>;
  #proxy: Observer<T>;
  #receiver: BroadcastChannel;
  #server: Session.ServerSession<StructuredCloneable.t, Observer<T>>;
  #transmitter: BroadcastChannel;

  complete() {
    if (this.state === Observable.State.NotComplete) this.#proxy.complete();
    this.#complete();
  }

  error(error: unknown) {
    if (this.state === Observable.State.NotComplete) this.#proxy.error(error);
    this.#error(error);
  }

  next(value: T) {
    if (this.state === Observable.State.NotComplete) this.#proxy.next(value);
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

export function fromChannel<T extends StructuredCloneable.t>(
  name: string
): BroadcastSubject<T> {
  return new BroadcastSubject<T>(name);
}
