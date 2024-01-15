import * as ClientAgent from "./ClientAgent.js";
import * as Codec from "./Codec.js";
import * as Fiber from "./Fiber.js";
import * as Injector from "./Injector.js";
import * as JsFunction from "./JsFunction.js";
import * as JsObject from "./JsObject.js";
import * as Message from "./Message.js";
import * as Observable from "./Observable/index.js";
import * as Proxy from "./Proxy.js";
import * as ServerAgent from "./ServerAgent.js";
import * as Subject from "./Subject.js";
import * as Subprotocol from "./Subprotocol.js";
import * as Supervisor from "./Supervisor.js";

export { Session as t };

/**
 * Calls the callback function when a registered value is garbage collected.
 * When function IO contains a proxy that proxy is registered with the registry
 * so that a message can be sent to the server to release that resource when the
 * proxy is disposed.
 *
 * Hermes, a popular JavaScript runtime for React Native apps, does not support
 * `FinalizationRegistry`.
 */
const registry =
  typeof FinalizationRegistry === "undefined"
    ? null
    : new FinalizationRegistry((callback: () => void) => callback());

/**
 * The address of the root server agent.
 */
const ROOT_AGENT_ADDRESS = "";

/**
 * An agent is either a client agent or a server agent. Agents look a lot like
 * actors.
 */
export type Agent = ClientAgent.t | ServerAgent.t;

/**
 * All sessions are observed by the root supervisor.
 */
export const rootSupervisor = Supervisor.init<Session>("RootSupervisor");

/**
 * A session spawns and observes agents. A session may spawn multiple server or
 * client agents while active. Terminating a session will terminate all agents
 * spawned by the session that are still active.
 *
 * If all agents spawned by the session are terminated then the session is
 * automatically terminated.
 */
export abstract class Session<
  DataType = unknown,
  Value = unknown
> extends Supervisor.t<Agent> {
  #input = Subject.init<Message.t<DataType>>();
  #output = Subject.init<Message.t<DataType>>();

  public readonly input = this.#input as Required<
    Observable.Observer<Message.t<DataType>>
  >;

  public readonly output = this.#output.asObservable();

  constructor(
    public readonly protocol: Subprotocol<DataType, Value>,
    public readonly injector?: Injector.t
  ) {
    super();
    rootSupervisor.observe(this);
    this.#autoTerminate();
    this.#warnIfIncompatible();
  }

  /**
   * Terminates the session, completing its input and output and terminating all
   * of its spawned agents.
   */
  terminate(): void {
    this.#input.complete();
    this.#output.complete();
    super.terminate();
  }

  /**
   * Spawns a new client agent.
   */
  protected createClient(this: Session, serverAddress: string): ClientAgent.t {
    const noReply = !Subprotocol.isBidirectional(
      this.protocol as Subprotocol.t<unknown>
    );

    const clientAgent = ClientAgent.init({
      encode: (value) => this.#encode(value),
      decode: (value) => this.#decode(value),
      input: this.#input.asObservable(),
      noReply,
      output: this.#output,
      serverAddress
    });

    this.observe(clientAgent);

    return clientAgent;
  }

  /**
   * Spawns a new server agent.
   */
  protected createServer(
    this: Session,
    provide: unknown,
    address: string = crypto.randomUUID()
  ): ServerAgent.t {
    const serverAgent = ServerAgent.init({
      address,
      encode: (value) => this.#encode(value),
      decode: (value) => this.#decode(value),
      injector: this.injector,
      input: this.#input.asObservable(),
      output: this.#output,
      provide
    });

    this.observe(serverAgent);

    return serverAgent;
  }

  /**
   * Decodes a message, spawning new client agents as proxies are discovered.
   *
   * When a proxy is created it is added to the registry so that the client
   * agent can be terminated if the proxy is disposed. When the client agent is
   * terminated a `GarbageCollect` message is sent to the server agent so that
   * it may be terminated as well.
   */
  #decode(value: unknown): unknown {
    const proxy = (address: string) => {
      const clientAgent = this.createClient(address);
      const proxy: object = clientAgent.createProxy();

      clientAgent.stateChange.subscribe((state) => {
        if (state === Fiber.State.Terminated) {
          this.#output.next(Message.GarbageCollect({ address }));
        }
      });

      registry?.register(proxy, () => clientAgent.terminate());

      return proxy;
    };

    return Codec.decode(value, proxy);
  }

  /**
   * Encodes a message, spawning new server agents as proxies are discovered.
   */
  #encode(value: unknown): unknown {
    const children: ServerAgent.t[] = [];

    const proxy = (value: unknown) => {
      const serverAgent = this.createServer(value);
      children.push(serverAgent);
      return serverAgent.address;
    };

    try {
      return Codec.encode(value, proxy);
    } catch (error) {
      children.forEach((agent) => agent.terminate());
      throw error;
    }
  }

  /**
   * Terminates the session if all of its agents are terminated.
   */
  #autoTerminate() {
    this.taskCount
      .pipe(
        Observable.filter((count) => count > 0),
        Observable.take(1)
      )
      .subscribe(() =>
        this.taskCount
          .pipe(Observable.filter((count) => count === 0))
          .subscribe(() => queueMicrotask(() => this.terminate()))
      );
  }

  /**
   * Logs a warning to the console if a message with an incompatible version is
   * received.
   */
  #warnIfIncompatible() {
    this.#input.subscribe((message) => {
      if (!Message.isCompatible(message.version))
        console.warn(
          `Incoming message with version ${message.version} is not strictly compatible with version ${Message.version}.`
        );
    });
  }
}

/**
 * Represents a client session. A proxy can be created from a client session for
 * calling remote functions.
 */
export class ClientSession<DataType, Value> extends Session<DataType, Value> {
  #clientAgent: ClientAgent.t;

  constructor(
    public readonly injector: Injector.t | undefined,
    public readonly protocol: Subprotocol<DataType, Value>
  ) {
    super(protocol, injector);
    this.#clientAgent = this.createClient(ROOT_AGENT_ADDRESS);
  }

  // TODO: Force value to extend object.
  createProxy(): Value extends object ? Proxy.t<Value> : JsObject.Empty {
    return this.#clientAgent.createProxy() as Value extends object
      ? Proxy.t<Value>
      : JsObject.Empty;
  }
}

/**
 * Represents a server session.
 */
export class ServerSession<DataType, Value> extends Session<DataType, Value> {
  constructor(
    public readonly injector: Injector.t | undefined,
    public readonly protocol: Subprotocol<DataType, Value>,
    public readonly value: Value
  ) {
    super(protocol, injector);
    this.createServer(value, ROOT_AGENT_ADDRESS);
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface Resource<Value> {
  type: "Resource";
}

/**
 * A container type for a remote resource. This exists as a workaround to the
 * absence of partial type inference in TypeScript.
 */
export const Resource = <Value>(): Resource<Value> => ({
  type: "Resource"
});

/**
 * The transporter protocol is type agnostic. Subprotocols are required for
 * type safety.
 */
type Subprotocol<DataType, Value> = Subprotocol.t<
  DataType,
  JsFunction.Input<ExtractFunctions<Value>>,
  JsFunction.Output<ExtractFunctions<Value>>
>;

interface Options<DataType, Value> {
  injector?: Injector.t;
  protocol: Subprotocol<DataType, Value>;
}

export interface ClientOptions<DataType, Value>
  extends Options<DataType, Value> {
  resource: Resource<Value>;
}

/**
 * Creates a new `ClientSession`.
 */
export function client<const DataType, Value>({
  injector,
  protocol,
  resource: _
}: ClientOptions<DataType, Value>): ClientSession<DataType, Value> {
  return new ClientSession(injector, protocol);
}

export interface ServerOptions<Protocol, Value>
  extends Options<Protocol, Value> {
  provide: Value;
}

/**
 * Creates a new `ServerSession`.
 */
export function server<DataType, Value>({
  injector,
  protocol,
  provide: value
}: ServerOptions<DataType, Value>): ServerSession<DataType, Value> {
  return new ServerSession(injector, protocol, value);
}

/**
 * Returns a union of function types from a type. If the type is an object then
 * functions will be extracted from the object recursively.
 */
type ExtractFunctions<T> = T extends JsFunction.t
  ? T
  : T extends object
    ? Extract<JsObject.NestedValues<T>, JsFunction.t>
    : never;
