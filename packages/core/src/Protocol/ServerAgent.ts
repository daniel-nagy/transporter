import {
  type Observable,
  type Observer,
  filter,
  takeUntil
} from "../Observable/index.js";
import * as Fiber from "../Fiber.js";
import * as Injector from "../Injector.js";
import * as JsFunction from "../JsFunction.js";
import * as JsObject from "../JsObject.js";
import * as Message from "./Message.js";

export { ServerAgent as t };

type Input = Observable<
  Message.CallFunction<unknown[]> | Message.GarbageCollect
>;

type Output = Required<
  Observer<Message.Error<unknown> | Message.SetValue<unknown>>
>;

/**
 * Encapsulates the responsibilities of a server in order to fulfill the
 * transporter protocol.
 *
 * A server listens for incoming messages to call a function or to dispose of
 * itself. When a server receives a message to call a function it calls the
 * function and then may respond with either an error or a value.
 *
 * When a server is created its address is added to the global address book.
 * That address is considered "claimed" and is unavailable until the server is
 * terminated.
 */
class ServerAgent extends Fiber.t {
  constructor(
    public readonly address: string,
    private readonly decode: (value: unknown) => unknown,
    private readonly encode: (value: unknown) => unknown,
    private readonly input: Input,
    private readonly output: Output,
    public readonly value: unknown,
    public readonly injector?: Injector.t
  ) {
    super();

    const terminated = this.stateChange.pipe(
      filter((state) => state === Fiber.State.Terminated)
    );

    this.input
      .pipe(
        takeUntil(terminated),
        filter((message) => message.address === this.address)
      )
      .subscribe((message) => this.#processMessage(message));
  }

  /**
   * Calls a function at an arbitrary path within an object such that the
   * calling context is preserved. If the path is empty then the value is a
   * function.
   */
  #callFunction({
    args,
    path
  }: {
    args: unknown[];
    path: string[];
  }): unknown | Promise<unknown> {
    const [subpath, name] = [path.slice(0, -1), ...path.slice(-1)];

    const getDependencies = (func: JsFunction.t) =>
      Injector.getTags(func).map((tag) => this.injector?.get(tag)) ?? [];

    if (name) {
      type CallingContext = Record<string, JsFunction.t>;

      const callingContext = JsObject.getIn(
        this.value,
        subpath
      ) as CallingContext;

      const dependencies = getDependencies(callingContext[name]!);
      return callingContext[name]!(...dependencies, ...args);
    }

    const func = JsObject.getIn(this.value, path) as JsFunction.t;
    const dependencies = getDependencies(func);
    return func(...dependencies, ...args);
  }

  /**
   * Receives a message and decides what to do with it.
   */
  async #processMessage(
    message: Message.CallFunction<unknown[]> | Message.GarbageCollect
  ) {
    switch (message.type) {
      case Message.Type.Call: {
        try {
          const output = this.#callFunction({
            args: this.decode(message.args) as unknown[],
            path: message.path
          });

          if (message.noReply) return;

          return this.output.next(
            Message.SetValue({
              address: this.address,
              id: message.id,
              value: this.encode(await output)
            })
          );
        } catch (error) {
          if (message.noReply) return;

          this.output.next(
            Message.Error({
              address: this.address,
              id: message.id,
              error: this.encode(error)
            })
          );
        }
        break;
      }
      case Message.Type.GarbageCollect:
        this.terminate();
    }
  }
}

export interface Options {
  address: string;
  decode(value: unknown): unknown;
  encode(value: unknown): unknown;
  injector?: Injector.t;
  input: Input;
  output: Output;
  provide: unknown;
}

/**
 * Creates a new `ServerAgent`.
 */
export function init({
  address,
  decode,
  encode,
  input,
  output,
  provide: value,
  injector
}: Options): ServerAgent {
  return new ServerAgent(
    address,
    decode,
    encode,
    input,
    output,
    value,
    injector
  );
}
