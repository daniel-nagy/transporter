import { afterEach, describe, expect, test } from "bun:test";
import { spy, spyOn } from "tinyspy";

import * as Cache from "./Cache.js";
import * as Fiber from "./Fiber.js";
import * as Injector from "./Injector.js";
import * as Json from "./Json.js";
import * as Message from "./Message.js";
import * as Metadata from "./Metadata.js";
import * as Observable from "./Observable/index.js";
import * as Proxy from "./Proxy.js";
import * as Session from "./Session.js";
import * as Subprotocol from "./Subprotocol.js";

afterEach(() => {
  Session.rootSupervisor.tasks.forEach((task) => task.terminate());
});

describe("session management", () => {
  test("a session observes an agent", () => {
    const { server, dispose } = expose(() => "🍌");
    expect(server.tasks.size).toBe(1);
    dispose();
  });

  test("function IO may create new agents", async () => {
    const { client, server, proxy, dispose } = expose(
      async () => async () => "🍌"
    );

    await proxy();
    expect(client.tasks.size).toBe(2);
    expect(server.tasks.size).toBe(2);
    dispose();
  });

  test("a session is not terminated when an agent is terminated if it is still observing other agents", async () => {
    const { server, proxy, dispose } = expose(async () => async () => "🍌");
    const fn = await proxy();
    const [agent] = server.tasks.values();
    agent!.terminate();
    expect(server.tasks.size).toBe(1);
    expect(server.state).toBe(Fiber.State.Active);
    expect(await fn()).toBe("🍌");
    dispose();
  });

  test("a session is terminated if all agents have been terminated", async () => {
    const { client, server, proxy, dispose } = expose(
      async () => async () => "🍌"
    );

    const noMoreTasks = client.taskCount.pipe(
      Observable.filter((count) => count === 0),
      Observable.firstValueFrom
    );

    await proxy();
    expect(client.tasks.size).toBe(2);
    expect(server.tasks.size).toBe(2);
    client.tasks.forEach((task) => task.terminate());
    await noMoreTasks;
    expect(client.tasks.size).toBe(0);
    expect(server.tasks.size).toBe(1);
    expect(client.state).toBe(Fiber.State.Terminated);
    expect(server.state).toBe(Fiber.State.Active);
    dispose();
  });

  test("an agent is terminated if a proxy is garbage collected", async () => {
    const { server, proxy, dispose } = expose(async () => async () => "🍌");

    {
      const _fn = await proxy();
    }

    expect(server.tasks.size).toBe(2);
    await scheduleTask(() => Bun.gc(true));
    await scheduleTask();
    expect(server.tasks.size).toBe(1);
    dispose();
  });
});

test("a warning is logged if a message is received with an incompatible version", () => {
  const { client, dispose } = expose(async () => "🍌");
  const consoleSpy = spyOn(console, "warn", () => {});

  client.input.next({
    ...Message.CallFunction({ address: "", args: [], path: [] }),
    version: "100.0.0"
  });

  consoleSpy.restore();
  dispose();
  expect(consoleSpy.callCount).toBe(1);

  expect(consoleSpy.calls).toEqual([
    [
      `Incoming message with version 100.0.0 is not strictly compatible with version ${Message.version}.`
    ]
  ]);
});

test("the calling context of a function proxy is preserved", async () => {
  const { proxy, dispose } = expose({
    fruit: "🍌",
    async getFruit() {
      return this.fruit;
    }
  });

  expect(await proxy.getFruit()).toBe("🍌");
  dispose();
});

describe("session state", () => {
  test("the session starts in an active state", () => {
    const { client, server, dispose } = expose(async () => "🍌");
    expect(server.state).toBe(Fiber.State.Active);
    expect(client.state).toBe(Fiber.State.Active);
    dispose();
  });

  test("the session transitions to a terminated state when terminated", () => {
    const { client, server, dispose } = expose(async () => "🍌");
    dispose();
    expect(server.state).toBe(Fiber.State.Terminated);
    expect(client.state).toBe(Fiber.State.Terminated);
  });

  test("state change emits and completes when the session is terminated", () => {
    const { server, dispose } = expose(async () => "🍌");
    const next = spy();
    const complete = spy();
    server.stateChange.subscribe({ next, complete });
    dispose();
    expect(next.callCount).toBe(2);
    expect(next.calls).toEqual([
      [Fiber.State.Active],
      [Fiber.State.Terminated]
    ]);
    expect(complete.callCount).toBe(1);
  });

  test("the session's output completes when terminated", () => {
    const { server, dispose } = expose(async () => "🍌");
    const complete = spy();
    server.output.subscribe({ complete });
    dispose();
    expect(complete.callCount).toBe(1);
  });
});

describe("dependency injection", () => {
  test("injecting a dependency", async () => {
    type Service = { id: string };
    const Service = Injector.Tag<Service>();
    const injector = Injector.empty().add(Service, { id: "🚀" });
    const func = spy(async (_service: Service) => {});

    const { proxy, dispose } = expose(Injector.provide([Service], func), {
      server: { injector }
    });

    await proxy();
    expect(func.calls).toEqual([[{ id: "🚀" }]]);
    dispose();
  });

  test("injecting multiple dependencies", async () => {
    type Service1 = { id: string };
    type Service2 = number;
    const Service1 = Injector.Tag<Service1>();
    const Service2 = Injector.Tag<Service2>();
    const injector = Injector.empty()
      .add(Service1, { id: "🚀" })
      .add(Service2, 13);
    const func = spy(async (_service1: Service1, _server2: Service2) => {});
    const { proxy, dispose } = expose(
      Injector.provide([Service1, Service2], func),
      { server: { injector } }
    );

    await proxy();
    expect(func.calls).toEqual([[{ id: "🚀" }, 13]]);
    dispose();
  });

  test("injecting a dependency with extra arguments", async () => {
    type Service = { id: string };
    const Service = Injector.Tag<Service>();
    const injector = Injector.empty().add(Service, { id: "🚀" });
    const func = spy(async (_service: Service, _a: number) => {});
    const { proxy, dispose } = expose(Injector.provide([Service], func), {
      server: { injector }
    });

    await proxy(13);
    expect(func.calls).toEqual([[{ id: "🚀" }, 13]]);
    dispose();
  });
});

describe("memoization", () => {
  test("memoizing a proxied function", async () => {
    const fn = spy(async () => ({ ok: "👌" }));
    const { proxy, dispose } = expose(fn);
    const memo = Cache.init().memo(proxy);

    expect(await memo()).toBe(await memo());
    expect(fn.callCount).toBe(1);
    dispose();
  });

  test("the function is called once if the arguments do not change", async () => {
    const fn = spy(async (_user: { id: string }) => {});
    const { proxy, dispose } = expose(fn);
    const memo = Cache.init().memo(proxy);

    await memo({ id: "foo" });
    await memo({ id: "foo" });
    expect(fn.callCount).toBe(1);
    dispose();
  });

  test("the function is called again if the arguments change", async () => {
    const fn = spy(async (user: { id: string }) =>
      user.id == "foo" ? "good" : "bad"
    );
    const { proxy, dispose } = expose(fn);
    const memo = Cache.init().memo(proxy);

    expect(await memo({ id: "foo" })).toBe("good");
    expect(await memo({ id: "bar" })).toBe("bad");
    expect(fn.callCount).toBe(2);
    expect(fn.calls).toEqual([[{ id: "foo" }], [{ id: "bar" }]]);
    dispose();
  });

  test("updating a value in the cache", async () => {
    const cache = Cache.init();
    const fn = spy(async () => ({ foo: "foo" }));
    const { proxy, dispose } = expose(fn);
    const memo = cache.memo(proxy);
    expect(await memo()).toEqual({ foo: "foo" });
    cache.update(proxy, [], () => Promise.resolve({ foo: "bar" }));
    expect(await memo()).toEqual({ foo: "bar" });
    expect(fn.callCount).toBe(1);
    dispose();
  });
});

describe("proxied objects", () => {
  test("proxied objects have metadata", () => {
    const { proxy, dispose } = expose({ bar: async () => {} });

    expect(Metadata.get(proxy)).toEqual({
      address: "",
      objectPath: []
    });

    expect(Metadata.get(proxy.bar)).toEqual({
      address: "",
      objectPath: ["bar"]
    });

    dispose();
  });

  test("trying to get the value of a proxy simply returns a new proxy", async () => {
    const { proxy, dispose } = expose({});
    const value2 = await proxy;

    expect(value2).toBe(proxy);
    dispose();
  });

  test("returning a proxied object", async () => {
    const { proxy, dispose } = expose(async () =>
      Proxy.from({ foo: async () => "👍" })
    );

    const childProxy = await proxy();

    expect(Metadata.get(childProxy)).toEqual({
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      address: expect.stringMatching(/\w{8}-\w{4}-\w{4}-\w{4}-\w{12}/),
      objectPath: []
    });

    expect(await childProxy.foo()).toEqual("👍");
    dispose();
  });
});

describe("reflection", () => {
  test("the root proxy", () => {
    const { proxy, dispose } = expose(async () => {});

    expect(Metadata.get(proxy)).toEqual({
      address: "",
      objectPath: []
    });

    dispose();
  });

  test("a child proxy", async () => {
    const { proxy, dispose } = expose({ a: async () => {} });

    expect(Metadata.get(proxy.a)).toEqual({
      address: "",
      objectPath: ["a"]
    });

    dispose();
  });
});

test("proxies are referentially stable", () => {
  {
    const { proxy, dispose } = expose({ foo: { bar: async () => {} } });

    const bar1 = proxy.foo.bar;
    const bar2 = proxy.foo.bar;

    expect(bar2).toBe(bar1);
    dispose();
  }

  {
    const { proxy, dispose } = expose({ foo: { bar: async () => {} } });
    let bar1;

    {
      const foo = proxy.foo;
      bar1 = foo.bar;
    }

    Bun.gc(true);
    const bar2 = proxy.foo.bar;

    expect(bar2).toBe(bar1);
    dispose();
  }

  {
    let bar1;
    let foo;
    let dispose;

    {
      let proxy;
      ({ proxy, dispose } = expose({ foo: { bar: async () => {} } }));
      foo = proxy.foo;
      bar1 = foo.bar;
    }

    Bun.gc(true);
    const bar2 = foo.bar;

    expect(bar2).toBe(bar1);
    dispose();
  }
});

test("unidirectional protocols do not return a value", async () => {
  const protocol = Subprotocol.init({
    connectionMode: Subprotocol.ConnectionMode.Connectionless,
    operationMode: Subprotocol.OperationMode.Broadcast,
    protocol: Subprotocol.Protocol<Json.t>(),
    transmissionMode: Subprotocol.TransmissionMode.Simplex
  });

  const value = spy(() => {});
  const next = spy();

  const server = Session.server({ protocol, provide: value });

  const client = Session.client({
    protocol,
    resource: Session.Resource<typeof value>()
  });

  connect(client, server);
  server.output.subscribe(next);
  const proxy = client.createProxy();
  proxy();

  await scheduleTask();

  expect(value.callCount).toBe(1);
  expect(next.callCount).toBe(0);
});

const jsonProtocol = Subprotocol.init({
  connectionMode: Subprotocol.ConnectionMode.ConnectionOriented,
  operationMode: Subprotocol.OperationMode.Unicast,
  protocol: Subprotocol.Protocol<Json.t>(),
  transmissionMode: Subprotocol.TransmissionMode.Duplex
});

function connect(client: Session.t, server: Session.t) {
  client.output.subscribe(server.input);
  server.output.subscribe(client.input);
}

function expose<const T>(
  value: T,
  {
    protocol = jsonProtocol,
    server: serverConfig
  }: {
    protocol?: typeof jsonProtocol;
    server?: { injector?: Injector.t };
  } = {}
) {
  const client = Session.client({
    protocol,
    resource: Session.Resource<T>()
  });

  const server = Session.server({
    ...serverConfig,
    protocol,
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

function scheduleTask<R>(callback: () => R = () => undefined as R) {
  return new Promise<R>((resolve) => setTimeout(() => resolve(callback())));
}
