import { assert, match, spy } from "sinon";

import * as Cache from "@daniel-nagy/transporter/Cache.js";
import * as Injector from "@daniel-nagy/transporter/Injector.js";
import * as Observable from "@daniel-nagy/transporter/Observable/index.js";
import * as PubSub from "@daniel-nagy/transporter/PubSub.js";
import * as Session from "@daniel-nagy/transporter/Session.js";
import * as StructuredCloneable from "./StructuredCloneable.js";
import * as Subprotocol from "@daniel-nagy/transporter/Subprotocol.js";

import { test } from "./Test.js";

describe("remote function call", () => {
  test("calling a function", async () => {
    const func = spy(async () => {});
    const { proxy, dispose } = expose(func);
    assert.match(await proxy(), undefined);
    assert.match(func.callCount, 1);
    assert.calledWithExactly(func);
    dispose();
  });

  test("calling a function that returns type null", async () => {
    const { proxy, dispose } = expose(async () => null);
    assert.match(await proxy(), null);
    dispose();
  });

  test("calling a function that returns type string", async () => {
    const { proxy, dispose } = expose(async () => "🚀");
    assert.match(await proxy(), "🚀");
    dispose();
  });

  test("calling a function that returns type number", async () => {
    const { proxy, dispose } = expose(async () => 13);
    assert.match(await proxy(), 13);
    dispose();
  });

  test("calling a function that returns type boolean", async () => {
    const { proxy, dispose } = expose(async () => true);
    assert.match(await proxy(), true);
    dispose();
  });

  test("calling a function that returns type array", async () => {
    const { proxy, dispose } = expose(async () => []);
    assert.match(await proxy(), []);
    dispose();
  });

  test("calling a function that returns type object", async () => {
    const { proxy, dispose } = expose(async () => ({}));
    assert.match(await proxy(), {});
    dispose();
  });

  test("calling a function that returns a date", async () => {
    const now = Date.now();
    const { proxy, dispose } = expose(async () => new Date(now));
    const date = await proxy();
    assert.match(date, new Date(now));
    dispose();
  });

  test("calling a function that returns a regex", async () => {
    const { proxy, dispose } = expose(async () => /👌/);
    const regex = await proxy();
    assert.match(regex.test("👌"), true);
    dispose();
  });

  test("calling a function that returns a bigint", async () => {
    const { proxy, dispose } = expose(async () => 1n);
    const big = await proxy();
    assert.match(big, 1n);
    dispose();
  });

  test("calling a function that returns an array buffer", async () => {
    const { proxy, dispose } = expose(async () => new ArrayBuffer(8));
    const buffer = await proxy();
    assert.match(buffer, new ArrayBuffer(8));
    dispose();
  });

  test("calling a function that returns a typed array", async () => {
    const { proxy, dispose } = expose(async () => new Uint8Array(8));
    const typedArray = await proxy();
    assert.match(typedArray, new Uint8Array(8));
    dispose();
  });

  test("calling a function that returns a map", async () => {
    const { proxy, dispose } = expose(async () => new Map([["ok", "👌"]]));
    const map = await proxy();
    assert.match(map.get("ok"), "👌");
    dispose();
  });

  test("calling a function that returns a set", async () => {
    const { proxy, dispose } = expose(async () => new Set(["👌"]));
    const set = await proxy();
    assert.match(set.has("👌"), true);
    dispose();
  });

  test("calling a function that returns a promise", async () => {
    const { proxy, dispose } = expose(async () => Promise.resolve("👍"));
    assert.match(await proxy(), "👍");
    dispose();
  });

  test("calling a function that returns a function", async () => {
    const { proxy, dispose } = expose(async () => async () => "👍");
    assert.match(await (await proxy())(), "👍");
    dispose();
  });

  test("calling a function that rejects", async () => {
    const { proxy, dispose } = expose(async () => Promise.reject("💣"));
    assert.match(await proxy().catch((e) => e), "💣");
    dispose();
  });

  test("calling a function that throws", async () => {
    const { proxy, dispose } = expose(async () => {
      throw "💣";
    });

    assert.match(await proxy().catch((e) => e), "💣");
    dispose();
  });

  test("calling a function that takes an argument of type undefined", async () => {
    const func = spy(async (_arg: undefined) => {});
    const { proxy, dispose } = expose(func);
    await proxy(undefined);
    assert.calledOnceWithExactly(func, undefined);
    dispose();
  });

  test("calling a function that takes an argument of type null", async () => {
    const func = spy(async (_arg: null) => {});
    const { proxy, dispose } = expose(func);
    await proxy(null);
    assert.calledOnceWithExactly(func, null);
    dispose();
  });

  test("calling a function that takes an argument of type string", async () => {
    const func = spy(async (_arg: string) => {});
    const { proxy, dispose } = expose(func);
    await proxy("🚀");
    assert.calledOnceWithExactly(func, "🚀");
    dispose();
  });

  test("calling a function that takes an argument of type number", async () => {
    const func = spy(async (_arg: number) => {});
    const { proxy, dispose } = expose(func);
    await proxy(13);
    assert.calledOnceWithExactly(func, 13);
    dispose();
  });

  test("calling a function that takes an argument of type boolean", async () => {
    const func = spy(async (_arg: boolean) => {});
    const { proxy, dispose } = expose(func);
    await proxy(false);
    assert.calledOnceWithExactly(func, false);
    dispose();
  });

  test("calling a function that takes an argument of type array", async () => {
    const func = spy(async (_arg: []) => {});
    const { proxy, dispose } = expose(func);
    await proxy([]);
    assert.calledOnceWithExactly(func, []);
    dispose();
  });

  test("calling a function that takes an argument of type object", async () => {
    // eslint-disable-next-line @typescript-eslint/ban-types
    const func = spy(async (_arg: {}) => {});
    const { proxy, dispose } = expose(func);
    await proxy({});
    assert.calledOnceWithExactly(func, {});
    dispose();
  });

  test("calling a function that takes many arguments of different type", async () => {
    const func = spy(
      // eslint-disable-next-line @typescript-eslint/ban-types
      async (..._args: [undefined, null, string, number, boolean, [], {}]) => {}
    );
    const { proxy, dispose } = expose(func);
    await proxy(undefined, null, "👍", 13, true, [], {});
    assert.calledOnceWithExactly(func, undefined, null, "👍", 13, true, [], {});
    dispose();
  });

  test("calling a function that takes a callback function", async () => {
    const func = spy(async (callback: () => Promise<string>) => callback());
    const callback = spy(async () => "👍");
    const { proxy, dispose } = expose(func);
    const result = await proxy(callback);
    assert.calledOnceWithExactly(func, match.func);
    assert.calledOnceWithExactly(callback);
    assert.match(result, "👍");
    dispose();
  });

  test("callback chaining", async () => {
    const callback1 = spy(async () => "👍");

    const callback2 = spy(async (callback: () => Promise<string>) =>
      callback()
    );

    const func = spy(
      async (callback: (callback: () => Promise<string>) => Promise<string>) =>
        callback(callback1)
    );

    const { proxy, dispose } = expose(func);
    const result = await proxy(callback2);
    assert.calledOnceWithExactly(func, match.func);
    assert.calledOnceWithExactly(callback2, match.func);
    assert.calledOnceWithExactly(callback1);
    assert.match(result, "👍");
    dispose();
  });

  test("calling a function that returns a function", async () => {
    const returnFunc = spy(async () => "👍");
    const func = spy(async () => returnFunc);
    const { proxy, dispose } = expose(func);
    const result = await proxy();
    assert.match(await result(), "👍");
    assert.calledOnceWithExactly(func);
    assert.calledOnceWithExactly(returnFunc);
    dispose();
  });

  test("return function chaining", async () => {
    const return1 = spy(async () => "👍");
    const return2 = spy(async () => return1);

    const func = spy(async () => return2);

    const { proxy, dispose } = expose(func);
    const result1 = await proxy();
    const result2 = await result1();
    assert.match(await result2(), "👍");
    assert.calledOnceWithExactly(func);
    assert.calledOnceWithExactly(return1);
    assert.calledOnceWithExactly(return2);
    dispose();
  });

  test("passing a proxy as an argument to a function", async () => {
    const obj = spy({
      a: async (callback: () => Promise<string>) => callback(),
      b: async () => "👍"
    });

    const { proxy, dispose } = expose(obj);
    const result = await proxy.a(proxy.b);
    assert.calledOnceWithExactly(obj.a, match.func);
    assert.calledOnceWithExactly(obj.b);
    assert.match(result, "👍");
    dispose();
  });

  test("calling a function from a proxied object", async () => {
    const { proxy, dispose } = expose({
      add: async (a: number, b: number) => a + b
    });

    assert.match(await proxy.add(2, 2), 4);
    dispose();
  });

  test("calling a function using the apply prototype method", async () => {
    const { proxy, dispose } = expose(async (a: number, b: number) => a + b);
    assert.match(await proxy.apply({}, [2, 2]), 4);
    dispose();
  });

  test("calling a function using the apply prototype method with a different this arg", async () => {
    const { proxy, dispose } = expose(async function (this: number, a: number) {
      return this + a;
    });

    assert.match(await proxy.apply(3, [2]), 5);
    dispose();
  });

  test("calling a function using the call prototype method", async () => {
    const { proxy, dispose } = expose(async (a: number, b: number) => a + b);
    assert.match(await proxy.call({}, 2, 2), 4);
    dispose();
  });

  test("calling a function using the call prototype method with a different this arg", async () => {
    const { proxy, dispose } = expose(async function (this: number, a: number) {
      return this + a;
    });
    assert.match(await proxy.call(3, 2), 5);
    dispose();
  });

  test("calling a function that returns a complex value", async () => {
    const { proxy, dispose } = expose(async () => ({
      a: "👍",
      b: [12, true],
      c: { c0: [null, { c1: "🚀" }, undefined] },
      d: undefined,
      e: async () => "👌"
    }));

    const result = await proxy();

    assert.match(result, {
      a: "👍",
      b: [12, true],
      c: { c0: [null, { c1: "🚀" }, undefined] },
      d: undefined,
      e: match.func
    });

    assert.match(await result.e(), "👌");
    dispose();
  });
});

test("using an observable", async () => {
  const { proxy, dispose } = expose(PubSub.from(Observable.of(1, 2, 3)));
  const complete = spy();
  const next = spy();

  await proxy.subscribe({ complete, next });
  assert.match(next.callCount, 3);
  assert.match(next.firstCall.args, [1]);
  assert.match(next.secondCall.args, [2]);
  assert.match(next.thirdCall.args, [3]);
  assert.match(complete.callCount, 1);
  dispose();
});

test("injecting a dependency", async () => {
  type Service = { id: string };
  const Service = Injector.Tag<Service>();
  const injector = Injector.empty().add(Service, { id: "🚀" });
  const func = spy(async (_service: Service) => {});

  const { proxy, dispose } = expose(Injector.provide([Service], func), {
    server: { injector }
  });

  await proxy();
  assert.calledOnceWithExactly(func, { id: "🚀" });
  dispose();
});

test("memoizing a proxied function", async () => {
  const fn = spy(async () => ({ ok: "👌" }));
  const { proxy, dispose } = expose(fn);
  const memo = Cache.init().memo(proxy);

  assert.match(await memo(), match.same(await memo()));
  assert.match(fn.callCount, 1);
  dispose();
});

const protocol = Subprotocol.init({
  connectionMode: Subprotocol.ConnectionMode.ConnectionOriented,
  operationMode: Subprotocol.OperationMode.Unicast,
  protocol: Subprotocol.Protocol<StructuredCloneable.t>(),
  transmissionMode: Subprotocol.TransmissionMode.Duplex
});

function connect(client: Session.t, server: Session.t) {
  client.output.subscribe(server.input);
  server.output.subscribe(client.input);
}

function expose<const T>(
  value: T,
  {
    server: serverConfig
  }: {
    server?: { injector?: Injector.t };
  } = {}
) {
  const client = Session.client({
    protocol: protocol,
    resource: Session.Resource<T>()
  });

  const server = Session.server({
    ...serverConfig,
    protocol: protocol,
    provide: value
  });

  connect(client, server);

  return {
    client,
    dispose: () => {
      client.terminate();
      server.terminate();
    },
    proxy: client.createProxy(),
    server
  };
}
