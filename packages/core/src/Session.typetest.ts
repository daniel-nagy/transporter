import * as Injector from "./Injector.js";
import * as Json from "./Json.js";
import * as Proxy from "./Proxy.js";
import * as Session from "./Session.js";
import * as Subprotocol from "./Subprotocol.js";

describe("recursive protocols", () => {
  const protocol = Subprotocol.init({
    connectionMode: Subprotocol.ConnectionMode.ConnectionOriented,
    operationMode: Subprotocol.OperationMode.Unicast,
    protocol: Subprotocol.Protocol<Json.t>(),
    transmissionMode: Subprotocol.TransmissionMode.Duplex
  });

  test("session types", () => {
    const session = Session.client({
      protocol,
      resource: Session.Resource<() => Promise<null>>()
    });

    session;
    // ^? const session: Session.ClientSession<Json.Json, () => Promise<null>>

    const { input, output } = session;

    input;
    // ^? const input: Required<Observer<Message.t<Json.Json>>>

    output;
    // ^? const output: Observable<Message.t<Json.Json>>
  });

  test("A type error is produced if Resource is not called.", () => {
    Session.client({
      protocol,
      // @ts-expect-error Did you mean to call this expression?
      resource: Session.Resource<() => null>
    });
  });

  test("A type error is produced if a procedure does not return a promise.", () => {
    Session.client({
      // @ts-expect-error Type 'null' is not assignable to type
      // 'Promise<RecursiveIo<Json>>'.
      protocol,
      resource: Session.Resource<() => null>()
    });
  });

  test("remote function returning null", () => {
    const session = Session.client({
      protocol,
      resource: Session.Resource<() => Promise<null>>()
    });

    const _proxy = session.createProxy();
    //    ^? const _proxy: () => Promise<null>
  });

  test("remote function returning number", () => {
    const session = Session.client({
      protocol,
      resource: Session.Resource<() => Promise<13>>()
    });

    const _proxy = session.createProxy();
    //    ^? const _proxy: () => Promise<13>
  });

  test("remote function returning string", () => {
    const session = Session.client({
      protocol,
      resource: Session.Resource<() => Promise<"🚀">>()
    });

    const _proxy = session.createProxy();
    //    ^? const _proxy: () => Promise<"🚀">
  });

  test("remote function returning boolean", () => {
    const session = Session.client({
      protocol,
      resource: Session.Resource<() => Promise<true>>()
    });

    const _proxy = session.createProxy();
    //    ^? const _proxy: () => Promise<true>
  });

  test("remote function returning array", () => {
    const session = Session.client({
      protocol,
      resource: Session.Resource<() => Promise<[]>>()
    });

    const _proxy = session.createProxy();
    //    ^? const _proxy: () => Promise<[]>
  });

  test("remote function returning object", () => {
    const session = Session.client({
      protocol,
      // eslint-disable-next-line @typescript-eslint/ban-types
      resource: Session.Resource<() => Promise<{}>>()
    });

    const _proxy = session.createProxy();
    //    ^? const _proxy: () => Promise<{}>
  });

  test("remote function returning function", async () => {
    const session = Session.client({
      protocol,
      resource: Session.Resource<() => Promise<() => Promise<null>>>()
    });

    const proxy = session.createProxy();
    //    ^? const proxy: () => Promise<() => Promise<null>>
    const _fn = await proxy();
    //    ^? const _fn: () => Promise<null>
  });

  test("generic function types are propagated", () => {
    const session = Session.client({
      protocol,
      resource:
        Session.Resource<<T extends Json.t>(_value: T) => Promise<null>>()
    });

    const _proxy = session.createProxy();
    //    ^? const _proxy: <T extends Json.Json>(_value: T) => Promise<null>
  });

  test("generic function types are propagated", () => {
    const session = Session.client({
      protocol,
      resource:
        Session.Resource<<T extends Json.t>(_value: T) => Promise<null>>()
    });

    const _proxy = session.createProxy();
    //    ^? const _proxy: <T extends Json.Json>(_value: T) => Promise<null>
  });

  test("generic function types must be constrained to the protocol", () => {
    Session.client({
      // @ts-expect-error Type 'unknown' is not assignable to type
      // 'RecursiveIo<Json>'.
      protocol,
      resource: Session.Resource<<T>(_value: T) => Promise<null>>()
    });
  });

  test("returning a chain of functions", async () => {
    const session = Session.client({
      protocol,
      resource:
        Session.Resource<() => Promise<() => Promise<() => Promise<"👍">>>>()
    });

    const proxy = session.createProxy();
    //    ^? const proxy: () => Promise<() => Promise<() => Promise<"👍">>>
    const fn0 = await proxy();
    //    ^? const fn0: () => Promise<() => Promise<"👍">>
    const fn1 = await fn0();
    //    ^? const fn1: () => Promise<"👍">
    const _value = await fn1();
    //    ^? const _value: "👍"
  });

  test("callback chaining", async () => {
    const session = Session.client({
      protocol,
      resource:
        Session.Resource<
          (
            callback0: (
              callback1: (callback2: () => Promise<string>) => Promise<string>
            ) => Promise<string>
          ) => Promise<string>
        >()
    });

    const proxy = session.createProxy();
    //    ^? const proxy: (callback0: (callback1: (callback2: () => Promise<string>) => Promise<string>) => Promise<string>) => Promise<string>
    const _value = await proxy((callback) => callback(async () => "👍"));
    //                                       ^? (parameter) callback: (callback2: () => Promise<string>) => Promise<string>
  });

  test("remote function returning complex value", async () => {
    const session = Session.client({
      protocol,
      resource: Session.Resource<
        () => Promise<{
          a: number;
          b: ["🚀", true];
          c: {
            c0: () => Promise<null>;
            c1: Proxy.t<{ aa: () => Promise<"👌"> }>;
          };
          d: null;
        }>
      >()
    });

    const proxy = session.createProxy();
    //    ^? const proxy: () => Promise<{
    //         a: number;
    //         b: ["🚀", true];
    //         c: {
    //             c0: () => Promise<null>;
    //             c1: Proxy.t<{
    //                 aa: () => Promise<"👌">;
    //             }>;
    //         };
    //         d: null;
    //       }>

    const _value = await proxy();
    //    ^? const _value: {
    //         a: number;
    //         b: ["🚀", true];
    //         c: {
    //             c0: () => Promise<null>;
    //             c1: Proxy.t<{
    //                 aa: () => Promise<"👌">;
    //             }>;
    //         };
    //         d: null;
    //       }
  });

  test("object with remote functions", async () => {
    type User = { id: string };

    type Api = {
      User: {
        get(id: string): Promise<User>;
        list(): Promise<User[]>;
      };
    };

    const session = Session.client({
      protocol,
      resource: Session.Resource<Api>()
    });

    const { User } = session.createProxy();
    //      ^? const User: {
    //           readonly get: (id: string) => Promise<User>;
    //           readonly list: () => Promise<User[]>;
    //         }

    User.get;
    //   ^? (method) get(id: string): Promise<User>

    const _user = await User.get("abc");
    //    ^? const _user: User

    const _users = await User.list();
    //    ^? const _users: User[]
  });

  test("class with remote functions", async () => {
    type User = { id: string };

    class UserService {
      foo!: string;
      async get(id: string): Promise<User> {
        return { id };
      }
      async list(): Promise<User[]> {
        return [];
      }
      #delete() {}
    }

    const session = Session.client({
      protocol,
      resource: Session.Resource<UserService>()
    });

    const proxy = session.createProxy();
    //    ^? const proxy: {
    //         readonly get: (id: string) => Promise<User>;
    //         readonly list: () => Promise<User[]>;
    //       }

    const _user = await proxy.get("abc");
    //    ^? const _user: User

    const _users = await proxy.list();
    //    ^? const _users: User[]
  });

  test("class functions must be asynchronous", async () => {
    type User = { id: string };

    class UserService {
      get(id: string): User {
        return { id };
      }
    }

    Session.client({
      // @ts-expect-error Type 'User' is missing the following properties from
      // type 'Promise<RecursiveIo<Json>>': then, catch, finally, ...
      protocol,
      resource: Session.Resource<UserService>()
    });
  });

  test("properties of remote objects are readonly", () => {
    const session = Session.client({
      protocol,
      resource: Session.Resource<{ a: () => Promise<string> }>()
    });

    const proxy = session.createProxy();

    // @ts-expect-error Cannot assign to 'a' because it is a read-only property.
    proxy.a = async () => "";
  });

  test("function with argument of type null", async () => {
    const session = Session.client({
      protocol,
      resource: Session.Resource<(a: null) => Promise<null>>()
    });

    const _proxy = session.createProxy();
    //    ^? const _proxy: (a: null) => Promise<null>
  });

  test("function with argument of type number", async () => {
    const session = Session.client({
      protocol,
      resource: Session.Resource<(a: number) => Promise<null>>()
    });

    const _proxy = session.createProxy();
    //    ^? const _proxy: (a: number) => Promise<null>
  });

  test("function with argument of type string", async () => {
    const session = Session.client({
      protocol,
      resource: Session.Resource<(a: string) => Promise<null>>()
    });

    const _proxy = session.createProxy();
    //    ^? const _proxy: (a: string) => Promise<null>
  });

  test("function with argument of type boolean", async () => {
    const session = Session.client({
      protocol,
      resource: Session.Resource<(a: boolean) => Promise<null>>()
    });

    const _proxy = session.createProxy();
    //    ^? const _proxy: (a: boolean) => Promise<null>
  });

  test("function with argument of type array", async () => {
    const session = Session.client({
      protocol,
      resource: Session.Resource<(a: []) => Promise<null>>()
    });

    const _proxy = session.createProxy();
    //    ^? const _proxy: (a: []) => Promise<null>
  });

  test("function with argument of type object", async () => {
    const session = Session.client({
      protocol,
      // eslint-disable-next-line @typescript-eslint/ban-types
      resource: Session.Resource<(a: {}) => Promise<null>>()
    });

    const _proxy = session.createProxy();
    //    ^? const _proxy: (a: {}) => Promise<null>
  });

  test("function with argument of type function", async () => {
    const session = Session.client({
      protocol,
      resource: Session.Resource<(a: () => Promise<null>) => Promise<null>>()
    });

    const proxy = session.createProxy();
    //    ^? const proxy: (a: () => Promise<null>) => Promise<null>

    proxy(async () => null);
    // ^? const proxy: (a: () => Promise<null>) => Promise<null>
  });

  test("function with complex argument", async () => {
    const session = Session.client({
      protocol,
      resource:
        Session.Resource<
          (arg: {
            a: number;
            b: ["🚀", true];
            c: { c0: () => Promise<null>; c1: { aa: () => Promise<"👌"> } };
            d: null;
          }) => Promise<null>
        >()
    });

    const _proxy = session.createProxy();
    //    ^? const _proxy: (arg: {
    //         a: number;
    //         b: ["🚀", true];
    //         c: {
    //             c0: () => Promise<null>;
    //             c1: {
    //                 aa: () => Promise<"👌">;
    //             };
    //         };
    //         d: null;
    //       }) => Promise<null>

    session.createProxy()({
      a: 13,
      b: ["🚀", true],
      c: {
        c0: async () => null,
        c1: Proxy.from({ aa: async () => "👌" })
      },
      d: null
    });
  });

  test("an injected dependency is removed from the call signature", () => {
    type Context = { clientId: string };
    const Context = Injector.Tag<Context>();

    const value = Injector.provide(
      [Context],
      async (_context: Context, _a: boolean) => null
    );

    const resource = Session.Resource<typeof value>();

    const session = Session.client({ protocol, resource });
    const _proxy = session.createProxy();
    //    ^? const _proxy: (_a: boolean) => Promise<null>
  });

  test("an injected dependency is excluded from protocol type checking", () => {
    type Context = { clientId: string } | undefined;
    const Context = Injector.Tag<Context>();

    const value = Injector.provide(
      [Context],
      async (_context: Context, _a: boolean) => null
    );

    const resource = Session.Resource<typeof value>();

    const session = Session.client({ protocol, resource });
    const _proxy = session.createProxy();
    //    ^? const _proxy: (_a: boolean) => Promise<null>
  });

  test("generic function types are propagated through injected functions", () => {
    type Context = { clientId: string };
    const Context = Injector.Tag<Context>();

    const value = Injector.provide(
      [Context],
      async <T extends Json.t>(_context: Context, _a: T) => null
    );

    const resource = Session.Resource<typeof value>();

    const session = Session.client({ protocol, resource });
    const _proxy = session.createProxy();
    //    ^? const _proxy: <T extends Json.Json>(_a: T) => Promise<null>
  });

  test("returning a proxy from a function", async () => {
    class Foo {
      a!: number;
      async b() {
        return "";
      }
    }

    const session = Session.client({
      protocol,
      resource:
        Session.Resource<
          () => Promise<Proxy.t<{ a: () => Promise<number>; foo: Foo }>>
        >()
    });

    const _value = await session.createProxy()();
    //    ^? const _value: {
    //         readonly a: () => Promise<number>;
    //         readonly foo: {
    //           readonly b: () => Promise<string>;
    //         };
    //       }
  });

  test("passing a proxy to a function", () => {
    class Foo {
      a!: number;
      async b() {
        return "";
      }
    }

    const session = Session.client({
      protocol,
      resource:
        Session.Resource<(arg: { b(): Promise<string> }) => Promise<null>>()
    });

    const _value = session.createProxy()(Proxy.from(new Foo()));
    //    ^? const _value: Promise<null>
  });

  test("an error is produced if a function takes an optional argument", async () => {
    Session.client({
      // @ts-expect-error Type 'string | undefined' is not assignable to type
      // 'ProtocolIO<Side.Remote>'.
      protocol,
      resource: Session.Resource<(a?: string) => string>()
    });
  });

  test("an error is produced if a function returns void", () => {
    // @ts-expect-error Type 'void' is not assignable to type
    // 'ProtocolIO<Side.Local>'.
    Session.client({ protocol, resource: Session.Resource<() => void>() });
  });

  test("an error is produced if a function returns undefined", () => {
    // @ts-expect-error Type 'undefined' is not assignable to type
    // 'ProtocolIO<Side.Local>'.
    Session.client({ protocol, resource: Session.Resource<() => undefined>() });
  });

  test("an error is produced if the type violates the protocol", () => {
    // @ts-expect-error Type 'Map<string, number>' is not assignable to type
    // 'ProtocolIO<Side.Local>'.
    Session.server({ provide: () => new Map<string, number>(), protocol });
  });

  test("an error is produced if a callback does not return a promise", () => {
    // @ts-expect-error Type 'null' is not assignable to type
    // 'Promise<ProtocolIO<Side.Remote>>'.
    Session.server({ provide: (_callback: () => null) => null, protocol });
  });
});

describe("unidirectional protocols", () => {
  const protocol = Subprotocol.init({
    connectionMode: Subprotocol.ConnectionMode.Connectionless,
    operationMode: Subprotocol.OperationMode.Broadcast,
    protocol: Subprotocol.Protocol<Json.t>(),
    transmissionMode: Subprotocol.TransmissionMode.Simplex
  });

  test("an error is produced if a procedure returns a value", () => {
    Session.client({
      // @ts-expect-error Type 'string' is not assignable to type 'void'.
      protocol,
      resource: Session.Resource<() => "test">()
    });
  });
});

declare function describe(message: string, callback: () => void): void;
declare function test(message: string, callback: () => void): void;
