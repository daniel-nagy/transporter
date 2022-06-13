import {
  Client,
  createClient,
  createServer,
  createService,
  RemoteService,
  RemoteValue,
  ServiceAPI,
  SessionPort,
  SessionManager,
  TimeoutError,
} from ".";
import { createMessageChannel } from "./message-channel";
import { BehaviorSubject, firstValueFrom, Observable } from "./Observable";

declare namespace globalThis {
  const gc: () => void;
}

describe("transporter", () => {
  test("providing an observable of type undefined", async () => {
    const { proxy } = provideValue(undefined as undefined);
    expect(await firstValueFrom(proxy)).toEqual(undefined);
  });

  test("providing an observable of type number", async () => {
    const { proxy } = provideValue(1);
    expect(await firstValueFrom(proxy)).toEqual(1);
  });

  test("providing an observable of type boolean", async () => {
    const { proxy } = provideValue(true);
    expect(await firstValueFrom(proxy)).toEqual(true);
  });

  test("providing an observable of type string", async () => {
    const { proxy } = provideValue("🥸");
    expect(await firstValueFrom(proxy)).toEqual("🥸");
  });

  test("providing an observable of type null", async () => {
    const { proxy } = provideValue(null as null);
    expect(await firstValueFrom(proxy)).toEqual(null);
  });

  test("providing a function with no arguments or return value", async () => {
    const value = jest.fn();
    const { proxy } = provideValue(value);
    await proxy();
    expect(value).toHaveBeenCalledTimes(1);
    expect(value).toHaveBeenCalledWith();
  });

  test("providing an observable of type object", async () => {
    const { proxy } = provideValue({});
    expect(await firstValueFrom(proxy)).toEqual({});
  });

  test("providing an observable of type array", async () => {
    const { proxy } = provideValue([]);
    expect(await firstValueFrom(proxy)).toEqual([]);
  });

  test("providing an observable of type object with a property of type undefined", async () => {
    const { proxy } = provideValue({ prop: undefined as undefined });
    expect(await firstValueFrom(proxy)).toEqual({ prop: undefined });
  });

  test("providing an observable of type object with a property of type number", async () => {
    const { proxy } = provideValue({ prop: 12 });
    expect(await firstValueFrom(proxy)).toEqual({ prop: 12 });
  });

  test("providing an observable of type object with a property of type boolean", async () => {
    const { proxy } = provideValue({ prop: false });
    expect(await firstValueFrom(proxy)).toEqual({ prop: false });
  });

  test("providing an observable of type object with a property of type string", async () => {
    const { proxy } = provideValue({ prop: "🥸" });
    expect(await firstValueFrom(proxy)).toEqual({ prop: "🥸" });
  });

  test("providing an observable of type object with a property of type null", async () => {
    const { proxy } = provideValue({ prop: null as null });
    expect(await firstValueFrom(proxy)).toEqual({ prop: null });
  });

  test("providing an observable of type object with a property of type function", async () => {
    const value = jest.fn();
    const { proxy } = provideValue({ prop: value });
    (await firstValueFrom(proxy)).prop();
    expect(value).toHaveBeenCalledTimes(1);
    expect(value).toHaveBeenCalledWith();
  });

  test("providing an observable of type array with an item of type undefined", async () => {
    const { proxy } = provideValue([undefined as undefined]);
    expect(await firstValueFrom(proxy)).toEqual([undefined]);
  });

  test("providing an observable of type array with an item of type number", async () => {
    const { proxy } = provideValue([23]);
    expect(await firstValueFrom(proxy)).toEqual([23]);
  });

  test("providing an observable of type array with an item of type boolean", async () => {
    const { proxy } = provideValue([true]);
    expect(await firstValueFrom(proxy)).toEqual([true]);
  });

  test("providing an observable of type array with an item of type string", async () => {
    const { proxy } = provideValue(["🥸"]);
    expect(await firstValueFrom(proxy)).toEqual(["🥸"]);
  });

  test("providing an observable of type array with an item of type null", async () => {
    const { proxy } = provideValue([null as null]);
    expect(await firstValueFrom(proxy)).toEqual([null]);
  });

  test("providing an observable of type array with an item of type function", async () => {
    const value = jest.fn();
    const { proxy } = provideValue([value]);
    (await firstValueFrom(proxy))[0]();
    expect(value).toHaveBeenCalledTimes(1);
    expect(value).toHaveBeenCalledWith();
  });

  test("providing an observable of type object with many properties of different types", async () => {
    const ab = jest.fn();
    const db2a = jest.fn();

    const { proxy } = provideValue({
      a: { aa: null as null, ab },
      b: "🥸",
      c: 3,
      d: {
        da: undefined as undefined,
        db: [24, true, { db2a }],
      },
    });

    const value = await firstValueFrom(proxy);

    expect(value.a.aa).toEqual(null);
    expect(value.b).toEqual("🥸");
    expect(value.c).toEqual(3);
    expect(value.d.da).toEqual(undefined);
    expect(value.d.db[0]).toEqual(24);
    expect(value.d.db[1]).toEqual(true);

    await value.a.ab();
    // @ts-expect-error Property 'db2a' does not exist on type 'number'
    await value.d.db[2].db2a();

    expect(ab).toHaveBeenCalledTimes(1);
    expect(ab).toHaveBeenCalledWith();
    expect(db2a).toHaveBeenCalledTimes(1);
    expect(db2a).toHaveBeenCalledWith();
  });

  test("explicitly providing an observable", async () => {
    const { proxy } = provideValue(Observable.of(42));
    expect(await firstValueFrom(proxy)).toEqual(42);
  });

  test("subscribing to a provided observable that emits values overtime", async () => {
    const subject = new BehaviorSubject(1);
    const { proxy } = provideValue(subject.asObservable());
    const next = jest.fn();

    proxy.subscribe(next);
    subject.next(2);
    await scheduleTask(() => subject.next(3));
    expect(next).toHaveBeenCalledTimes(3);
    expect(next).toHaveBeenCalledWith(1);
    expect(next).toHaveBeenCalledWith(2);
    expect(next).toHaveBeenCalledWith(3);
  });

  test("destructuring provided values", async () => {
    const proxy = createTestService({
      provide: { a: "a", b: "b", c: () => "c" },
    });

    const { a, b, c } = proxy;

    expect(await firstValueFrom(a)).toEqual("a");
    expect(await firstValueFrom(b)).toEqual("b");
    expect(await c()).toEqual("c");
  });

  test("enumerating provided values throws a TypeError", () => {
    const proxy = createTestService({
      provide: { a: "a", b: "b", c: () => "c" },
    });

    expect(() => {
      const { ...values } = proxy;
    }).toThrow(TypeError);

    expect(() => Object.keys(proxy)).toThrow(TypeError);
    expect(() => Object.values(proxy)).toThrow(TypeError);
    expect(() => Object.entries(proxy)).toThrow(TypeError);

    expect(() => {
      for (const _key in proxy) {
      }
    }).toThrow(TypeError);
  });

  test("calling a provided function with an argument of type undefined", async () => {
    const value = jest.fn((_arg?: string) => {});
    const { proxy } = provideValue(value);
    await proxy(undefined);
    expect(value).toHaveBeenCalledWith(undefined);
  });

  test("calling a provided function with an argument of type number", async () => {
    const value = jest.fn((_arg: number) => {});
    const { proxy } = provideValue(value);
    await proxy(2);
    expect(value).toHaveBeenCalledWith(2);
  });

  test("calling a provided function with an argument of type boolean", async () => {
    const value = jest.fn((_arg: boolean) => {});
    const { proxy } = provideValue(value);
    await proxy(false);
    expect(value).toHaveBeenCalledWith(false);
  });

  test("calling a provided function with an argument of type string", async () => {
    const value = jest.fn((_arg: string) => {});
    const { proxy } = provideValue(value);
    await proxy("🥸");
    expect(value).toHaveBeenCalledWith("🥸");
  });

  test("calling a provided function with an argument of type null", async () => {
    const value = jest.fn((_arg: string | null) => {});
    const { proxy } = provideValue(value);
    await proxy(null);
    expect(value).toHaveBeenCalledWith(null);
  });

  test("calling a provided function with an argument of type object", async () => {
    const value = jest.fn((_arg: Record<string, unknown>) => {});
    const { proxy } = provideValue(value);
    await proxy({ a: "a" });
    expect(value).toHaveBeenCalledWith({ a: "a" });
  });

  test("calling a provided function with an argument of type array", async () => {
    const value = jest.fn((_arg: string[]) => {});
    const { proxy } = provideValue(value);
    await proxy(["a", "b"]);
    expect(value).toHaveBeenCalledWith(["a", "b"]);
  });

  test("calling a provided function with an argument of type function", async () => {
    const value = jest.fn((cb: () => void) => cb());
    const { proxy } = provideValue(value);
    const callback = jest.fn();

    await proxy(callback);
    expect(value).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  test("calling a provided function that throws an error", async () => {
    const value = jest.fn(() => {
      throw "💣";
    });

    const { proxy } = provideValue(value);

    await expect(proxy).rejects.toBe("💣");
  });

  test("callback arguments", async () => {
    const value = jest.fn((cb: (arg: string) => void) => cb("🥸"));
    const { proxy } = provideValue(value);
    const callback = jest.fn();

    await proxy(callback);
    expect(value).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith("🥸");
  });

  test("callback chaining", async () => {
    const a = jest.fn(() => "🥸");
    const b = jest.fn((cb) => cb());
    const c = jest.fn((cb) => cb(a));
    const { proxy } = provideValue(c);

    expect(await proxy(b)).toBe("🥸");
    expect(c).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
    expect(a).toHaveBeenCalledTimes(1);
  });

  test("calling a provided function with a return value of type undefined", async () => {
    const { proxy } = provideValue(jest.fn(() => {}));
    expect(await proxy()).toEqual(undefined);
  });

  test("calling a provided function with a return value of type number", async () => {
    const { proxy } = provideValue(jest.fn(() => 3));
    expect(await proxy()).toEqual(3);
  });

  test("calling a provided function with a return value of type boolean", async () => {
    const { proxy } = provideValue(jest.fn(() => true));
    expect(await proxy()).toEqual(true);
  });

  test("calling a provided function with a return value of type string", async () => {
    const { proxy } = provideValue(jest.fn(() => "🥸"));
    expect(await proxy()).toEqual("🥸");
  });

  test("calling a provided function with a return value of type null", async () => {
    const { proxy } = provideValue(jest.fn(() => null));
    expect(await proxy()).toEqual(null);
  });

  test("calling a provided function with a return value of type object", async () => {
    const { proxy } = provideValue(jest.fn(() => ({})));
    expect(await proxy()).toEqual({});
  });

  test("calling a provided function with a return value of type array", async () => {
    const { proxy } = provideValue(jest.fn(() => []));
    expect(await proxy()).toEqual([]);
  });

  test("calling a provided function with a return value of type function", async () => {
    const { proxy } = provideValue(jest.fn(() => () => {}));
    expect(typeof (await proxy())).toEqual("function");
  });

  test("return function chaining", async () => {
    const a = jest.fn(() => "🥸");
    const b = jest.fn(() => a);
    const c = jest.fn(() => b);
    const d = jest.fn(() => c);
    const { proxy } = provideValue(d);

    const result = await (await (await (await proxy())())())();

    expect(result).toBe("🥸");
    expect(d).toHaveBeenCalledTimes(1);
    expect(d).toHaveBeenCalledWith();
    expect(a).toHaveBeenCalledTimes(1);
    expect(a).toHaveBeenCalledWith();
    expect(b).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledWith();
    expect(c).toHaveBeenCalledTimes(1);
    expect(c).toHaveBeenCalledWith();
  });

  test("function spread arguments", async () => {
    const sum = (...numbers: number[]) =>
      numbers.reduce((sum, num) => sum + num, 0);
    const { proxy } = provideValue(jest.fn(sum));

    expect(await proxy(1, 2, 3)).toEqual(6);
    expect(await proxy(...[1, 2, 3])).toEqual(6);
  });

  test("function apply", async () => {
    const sum = (...numbers: number[]) =>
      numbers.reduce((sum, num) => sum + num, 0);
    const { proxy } = provideValue(jest.fn(sum));

    expect(await proxy.apply(proxy, [1, 2, 3])).toEqual(6);
  });

  test("function apply with a different this arg", async () => {
    const { proxy } = provideValue(
      jest.fn(function test(this: any) {
        return this;
      })
    );
    expect(await proxy.apply({ a: "a" })).toEqual({ a: "a" });
  });

  test("function bind", async () => {
    const { proxy } = provideValue(
      jest.fn(function test(this: any) {
        return this;
      })
    );

    const newFunc = await proxy.bind({ a: "a" });
    expect(await newFunc()).toEqual({ a: "a" });
  });

  test("function call", async () => {
    const sum = (...numbers: number[]) =>
      numbers.reduce((sum, num) => sum + num, 0);
    const { proxy } = provideValue(jest.fn(sum));

    expect(await proxy.call(proxy, 1, 2, 3)).toEqual(6);
  });

  test("function call with a different this arg", async () => {
    const { proxy } = provideValue(
      jest.fn(function test(this: any) {
        return this;
      })
    );
    expect(await proxy.call({ a: "a" })).toEqual({ a: "a" });
  });

  test("multiple services using the same transport", async () => {
    const channel = createMessageChannel();

    const A = createTestService({
      channel,
      provide: { default: "a" },
      scheme: "a",
    });

    const B = createTestService({
      channel,
      provide: { default: "b" },
      scheme: "b",
    });

    expect(await firstValueFrom(A.default)).toEqual("a");
    expect(await firstValueFrom(B.default)).toEqual("b");
  });

  test("linking the same service more than once", async () => {
    const [p1, p2] = createMessageChannel();
    const scheme = "test";

    createServer({
      router: [{ path: "/", provide: createService({ default: "a" }) }],
      scheme,
      sessionManagers: [createSessionManager(p1)],
    });

    const { default: A0 } = createSession(p2).link<{ default: "a" }>(scheme);
    const { default: A1 } = createSession(p2).link<{ default: "a" }>(scheme);

    expect(await firstValueFrom(A0)).toEqual("a");
    expect(await firstValueFrom(A1)).toEqual("a");
  });

  test("bidirectional servers and clients", async () => {
    const [p1, p2] = createMessageChannel();

    const A = createTestService({
      provide: { default: "a" },
      channel: [p1, p2],
    });

    const B = createTestService({
      provide: { default: "b" },
      channel: [p2, p1],
    });

    expect(await firstValueFrom(A.default)).toEqual("a");
    expect(await firstValueFrom(B.default)).toEqual("b");
  });

  test("messages must have the correct uri and source", async () => {
    const [p1, p2] = createMessageChannel();
    const spy = jest.spyOn(p1, "send");

    createServer({
      router: [{ path: "/", provide: createService({ default: "a" }) }],
      scheme: "a",
      sessionManagers: [createSessionManager(p1)],
    });

    const message = {
      args: [JSON.stringify({ type: "function" })],
      id: 1,
      path: ["default", "subscribe"],
      source: "jest",
      type: "call",
      uri: "b",
    };

    p2.send(JSON.stringify(message));
    await scheduleTask();
    expect(spy).not.toHaveBeenCalled();

    p2.send(JSON.stringify({ ...message, uri: "a" }));
    await scheduleTask();
    expect(spy).not.toHaveBeenCalled();

    p2.send(JSON.stringify({ ...message, source: "transporter" }));
    await scheduleTask();
    expect(spy).not.toHaveBeenCalled();

    p2.send(JSON.stringify({ ...message, source: "transporter", uri: "a" }));

    await scheduleTask();
    expect(spy).toHaveBeenCalledTimes(1);
    expect(JSON.parse(spy.mock.calls[0][0])).toEqual({
      id: message.id,
      source: "transporter",
      type: "set",
      uri: "a",
      value: {
        unsubscribe: {
          type: "function",
          uri: expect.stringMatching(/[\da-z]{9}/),
        },
      },
    });
  });

  test("the promise will be rejected if a signal is not received in the allowed time", async () => {
    jest.useFakeTimers();

    const [, p2] = createMessageChannel();
    const proxy = createSession({ port: p2, timeout: 1000 }).link("test");
    const assertion = expect(proxy).rejects.toThrow(TimeoutError);

    jest.advanceTimersByTime(1000);
    await assertion;
    jest.useRealTimers();
  });

  test("a provided function that returns a promise will not cause a timeout error", async () => {
    jest.useFakeTimers();

    const { proxy } = provideValue(
      () => new Promise((resolve) => setTimeout(() => resolve("ok"), 2000))
    );

    const assertion = expect(proxy()).resolves.toEqual("ok");

    jest.advanceTimersByTime(2000);
    await assertion;
    jest.useRealTimers();
  });

  test("proxied functions are garbage collected", async () => {
    const [p1, p2] = createMessageChannel();
    const spy = jest.spyOn(p2, "send");

    const proxy = createTestService({
      channel: [p1, p2],
      provide: { default: () => () => "🥸" },
    });

    let proxyFunc: (() => Promise<string>) | null = await proxy.default();

    globalThis.gc();
    await scheduleTask();

    expect(spy).not.toHaveBeenCalledWith(
      expect.stringContaining('"type":"garbage_collect"')
    );

    proxyFunc = null;

    globalThis.gc();
    await scheduleTask();

    expect(spy).toHaveBeenLastCalledWith(
      expect.stringContaining('"type":"garbage_collect"')
    );

    proxyFunc = await proxy.default();
    expect(await proxyFunc?.()).toEqual("🥸");
  });
});

function createSession(
  optionsOrPort: { port: SessionPort; timeout?: number } | SessionPort
): Client {
  const { port, timeout = undefined } =
    "send" in optionsOrPort ? { port: optionsOrPort } : optionsOrPort;

  return createClient({ port, timeout });
}

function createSessionManager(port: SessionPort): SessionManager {
  return {
    connect: Observable.of(port),
  };
}

function createTestService<T extends ServiceAPI>({
  channel: [p1, p2] = createMessageChannel(),
  path = "",
  provide: api,
  scheme = "test",
}: {
  channel?: [SessionPort, SessionPort];
  path?: string;
  provide: T;
  scheme?: string;
}): RemoteService<T> {
  createServer({
    router: [{ path, provide: createService(api) }],
    scheme,
    sessionManagers: [createSessionManager(p1)],
  });

  return createSession(p2).link<T>(`${scheme}:${path}`);
}

function provideValue<T extends ServiceAPI[keyof ServiceAPI]>(
  value: T
): { proxy: RemoteValue<T> } {
  const proxy = createTestService({ provide: { default: value } });
  return { proxy: proxy.default };
}

function scheduleTask<R>(callback?: () => R) {
  return new Promise((resolve) => setTimeout(() => resolve(callback?.())));
}
