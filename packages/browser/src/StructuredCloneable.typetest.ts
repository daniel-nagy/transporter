// These path imports are a workaround for https://github.com/JoshuaKGoldberg/eslint-plugin-expect-type/issues/101.
import * as Injector from "../../../node_modules/@daniel-nagy/transporter/src/Injector.js";
import * as Session from "../../../node_modules/@daniel-nagy/transporter/src/Session.js";
import * as StructuredCloneable from "./StructuredCloneable.js";
import * as Subprotocol from "../../../node_modules/@daniel-nagy/transporter/src/Subprotocol.js";

const protocol = Subprotocol.init({
  connectionMode: Subprotocol.ConnectionMode.ConnectionOriented,
  operationMode: Subprotocol.OperationMode.Unicast,
  protocol: Subprotocol.Protocol<StructuredCloneable.t>(),
  transmissionMode: Subprotocol.TransmissionMode.Duplex
});

protocol;
// ^? const protocol: Subprotocol.t<StructuredCloneable.StructuredCloneable, RecursiveIo<StructuredCloneable.StructuredCloneable>, Promise<RecursiveIo<StructuredCloneable.StructuredCloneable>>>

test("session types", () => {
  const session = Session.client({
    protocol,
    resource: Session.Resource<() => Promise<void>>()
  });

  session;
  // ^? const session: Session.ClientSession<StructuredCloneable.StructuredCloneable, () => Promise<void>>

  const { input, output } = session;

  input;
  // ^? const input: Required<Observer<Message<StructuredCloneable.StructuredCloneable>>>
  output;
  // ^? const output: Observable<Message<StructuredCloneable.StructuredCloneable>>

  const _proxy = session.createProxy();
  //    ^? const _proxy: () => Promise<void>
});

describe("Remote function call", () => {
  test("a function that returns undefined", () => {
    const session = Session.client({
      protocol,
      resource: Session.Resource<() => Promise<undefined>>()
    });

    const _proxy = session.createProxy();
    //    ^? const _proxy: () => Promise<undefined>
  });

  test("a function that returns null", () => {
    const session = Session.client({
      protocol,
      resource: Session.Resource<() => Promise<null>>()
    });

    const _proxy = session.createProxy();
    //    ^? const _proxy: () => Promise<null>
  });

  test("a function that returns a string", () => {
    const session = Session.client({
      protocol,
      resource: Session.Resource<() => Promise<"🚀">>()
    });

    const _proxy = session.createProxy();
    //    ^? const _proxy: () => Promise<"🚀">
  });

  test("a function that returns a number", () => {
    const session = Session.client({
      protocol,
      resource: Session.Resource<() => Promise<13>>()
    });

    const _proxy = session.createProxy();
    //    ^? const _proxy: () => Promise<13>
  });

  test("a function that returns a boolean", () => {
    const session = Session.client({
      protocol,
      resource: Session.Resource<() => Promise<true>>()
    });

    const _proxy = session.createProxy();
    //    ^? const _proxy: () => Promise<true>
  });

  test("a function that returns an array", () => {
    const session = Session.client({
      protocol,
      resource: Session.Resource<() => Promise<[]>>()
    });

    const _proxy = session.createProxy();
    //    ^? const _proxy: () => Promise<[]>
  });

  test("a function that returns an object", () => {
    const session = Session.client({
      protocol,
      // eslint-disable-next-line @typescript-eslint/ban-types
      resource: Session.Resource<() => Promise<{}>>()
    });

    const _proxy = session.createProxy();
    //    ^? const _proxy: () => Promise<{}>
  });

  test("a function that returns a function", () => {
    const session = Session.client({
      protocol,
      resource: Session.Resource<() => Promise<() => Promise<void>>>()
    });

    const _proxy = session.createProxy();
    //    ^? const _proxy: () => Promise<() => Promise<void>>
  });

  test("function apply", () => {
    const session = Session.client({
      protocol,
      resource: Session.Resource<(arg: number) => Promise<boolean>>()
    });

    const proxy = session.createProxy();

    const _result = proxy.apply(null, [3]);
    //    ^? const _result: Promise<boolean>
  });

  test("function call", () => {
    const session = Session.client({
      protocol,
      resource: Session.Resource<(arg: number) => Promise<boolean>>()
    });

    const proxy = session.createProxy();

    const _result = proxy.call(null, 3);
    //    ^? const _result: Promise<boolean>
  });

  test("A callback parameter must return a promise", () => {
    Session.client({
      // @ts-expect-error Type 'void' is not assignable to type
      // 'Promise<RecursiveIo<StructuredCloneable>>'.
      protocol,
      resource: Session.Resource<() => void>()
    });
  });

  test("function bind", () => {
    const session = Session.client({
      protocol,
      resource: Session.Resource<() => Promise<void>>()
    });

    const proxy = session.createProxy();
    const _value = proxy.bind(4);
    //    ^? const _value: () => Promise<void>
  });

  test("proxied object", () => {
    const session = Session.client({
      protocol,
      resource: Session.Resource<{ foo: () => Promise<"🥸"> }>()
    });

    const _proxy = session.createProxy();
    //    ^? const _proxy: {
    //           readonly foo: () => Promise<"🥸">;
    //       }
  });

  test("nested proxied objects", () => {
    const session = Session.client({
      protocol,
      resource: Session.Resource<{ foo: { bar: () => Promise<"🥸"> } }>()
    });

    const _proxy = session.createProxy();
    //    ^? const _proxy: {
    //           readonly foo: {
    //               readonly bar: () => Promise<"🥸">;
    //           };
    //       }
  });
});

describe("dependency injection", () => {
  test("injected dependencies are omitted from the type", () => {
    type Service = { id: string };
    const Service = Injector.Tag<Service>();
    const func = Injector.provide([Service], async (_service: Service) => {});

    const session = Session.client({
      protocol,
      resource: Session.Resource<typeof func>()
    });

    const _proxy = session.createProxy();
    //    ^? const _proxy: () => Promise<void>
  });

  test("extra args are kept", () => {
    type Service = { id: string };
    const Service = Injector.Tag<Service>();

    const func = Injector.provide(
      [Service],
      async (_service: Service, _a: number) => {}
    );

    const session = Session.client({
      protocol,
      resource: Session.Resource<typeof func>()
    });

    const _proxy = session.createProxy();
    //    ^? const _proxy: (_a: number) => Promise<void>
  });
});

declare function describe(message: string, callback: () => void): void;
declare function test(message: string, callback: () => void): void;
