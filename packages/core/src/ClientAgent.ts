import * as Fiber from "./Fiber.js";
import * as Message from "./Message.js";
import * as Metadata from "./Metadata.js";
import * as Observable from "./Observable/index.js";

export { ClientAgent as t };

namespace Js {
  export const Proxy = globalThis.Proxy;
}

type Input = Observable.t<Message.Error<unknown> | Message.SetValue<unknown>>;

type Output = Required<Observable.Observer<Message.CallFunction<unknown[]>>>;

/**
 * Encapsulates the responsibilities of a client in order to fulfill the
 * transporter protocol.
 *
 * A client uses a proxy to interface with a remote resource. When a function is
 * called, using the proxy, a message is sent to the server to call the function.
 * A promise is returned while the client waits for the server to respond
 * with either a value or an error.
 */
export class ClientAgent extends Fiber.t {
  constructor(
    private readonly decode: (value: unknown) => unknown,
    private readonly encode: (value: unknown) => unknown,
    private readonly input: Input,
    private readonly noReply: boolean,
    private readonly output: Output,
    public readonly serverAddress: string
  ) {
    super();
  }

  /**
   * Waits for a response from the server when calling a function.
   *
   * @todo Add timeout operator as a fail safe.
   */
  #awaitResponse(message: Message.CallFunction<unknown[]>) {
    const promise = this.input.pipe(
      Observable.filter(({ id }) => id === message.id),
      // timeout(5000),
      Observable.flatMap((reply) => {
        switch (reply.type) {
          case Message.Type.Error:
            return Observable.fail(this.decode(reply.error));
          case Message.Type.Set:
            return Observable.of(this.decode(reply.value));
        }
      }),
      Observable.firstValueFrom
    );

    this.output.next(message);

    return promise;
  }

  /**
   * Creates a `Proxy` object for a remote resource. This creates the illusion
   * that the resource is local, allowing familiar procedural programming to be
   * used to interface with the remote resource. However, because the resource
   * is in fact remote, all function calls will return a promise.
   *
   * For a proxied object it is possible to dereference a value at an arbitrary
   * path within the object. Transporter guarantees these child proxies are
   * referentially stable, as you would expect if you dereferenced a value in an
   * ordinary object.
   *
   * @example
   *
   * ```
   * type User = {
   *   id: string;
   *   name: string;
   * };
   *
   * // Our API exposes a `User` module with functions for accessing user data.
   * type Api = {
   *   User: {
   *     get(id: string): User;
   *     list(limit?: number): User[]
   *   }
   * };
   *
   * const session = Session.client<Api>({
   *   protocol: JsonProtocol,
   *   serverAddress: "api@v1"
   * });
   *
   * // The `User` module can be dereferenced from the proxy.
   * const { User } = session.createProxy();
   *
   * // We can now call functions directly using the proxy. Because the
   * // functions are actually remote we get a Promise.
   * const user = await User.get("User:abc");
   * const users = await User.list(10);
   *```
   *
   * Because Transporter guarantees proxies are referentially stable you can
   * reliably use memoization to cache the output of a function.
   *
   * @example
   *
   * ```
   * const cache = Cache.init();
   * const getUser = cache.memo(User.get);
   * // The output will be cached. Calling `getUser` again with the same
   * // arguments will return the stored value from the cache.
   * const user = getUser("User:abc");
   *```
   *
   * In addition, it is possible to get metadata about a proxy using the
   * Metadata API.
   *
   * @example
   *
   * ```
   * const metadata = Metadata.get(User.get));
   *
   * assert.equal(metadata, {
   *   address: "api@v1",
   *   objectPath: ["User", "get"]
   * });
   * ```
   */
  createProxy(path: string[] = []) {
    const children: Record<string, unknown> = {};

    const meta: Metadata.t = {
      clientAgentId: this.id,
      objectPath: path
    };

    const proxy = new Js.Proxy(() => {}, {
      apply: (_target, _thisArg, input) => {
        const message = Message.CallFunction({
          address: this.serverAddress,
          args: this.encode(input) as unknown[],
          noReply: this.noReply,
          path
        });

        return this.noReply
          ? this.output.next(message)
          : this.#awaitResponse(message);
      },
      get: (target, prop, receiver) => {
        switch (true) {
          case prop === Metadata.symbol:
            return meta;
          case typeof prop === "symbol":
            return Reflect.get(target, prop, receiver);
          case prop === "then":
            // Prevents promise chaining if the proxy is awaited or resolved.
            return undefined;
          case prop === "toJSON":
            return undefined;
          default:
            if (!children[prop])
              children[prop] = this.createProxy([...path, prop]);

            return children[prop];
        }
      },
      getOwnPropertyDescriptor: (target, property) => {
        switch (property) {
          case Metadata.symbol:
            return { configurable: true };
          default:
            return Reflect.getOwnPropertyDescriptor(target, property);
        }
      },
      has(target, property) {
        switch (property) {
          case Metadata.symbol:
            return true;
          default:
            return Reflect.has(target, property);
        }
      },
      ownKeys(_target) {
        // Prevents enumeration of the proxy. Attempting to enumerate the proxy
        // will throw a `TypeError`, this includes using the rest syntax when
        // destructuring the proxy.
        return undefined as unknown as [];
      }
    });

    return proxy;
  }
}

export interface Options {
  decode(value: unknown): unknown;
  encode(value: unknown): unknown;
  input: Input;
  noReply: boolean;
  output: Output;
  serverAddress: string;
}

/**
 * Creates a new `ClientAgent`.
 */
export function init({
  decode,
  encode,
  input,
  noReply,
  output,
  serverAddress
}: Options): ClientAgent {
  return new ClientAgent(decode, encode, input, noReply, output, serverAddress);
}
