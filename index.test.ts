import { createProxy, expose, Exposable, Remote, TimeoutError } from "./index";

declare namespace globalThis {
  const gc: () => void;
}

type MessageSubscriber = (event: { data: string }) => void;

const createMessageTarget = () => ({
  _callbacks: [] as MessageSubscriber[],
  addEventListener(_type: "message", callback: MessageSubscriber) {
    this._callbacks = [...this._callbacks, callback];
  },
  postMessage(message: string) {
    this._callbacks.forEach(callback => callback({ data: message }));
  },
  removeEventListener(_type: "message", callback: MessageSubscriber) {
    this._callbacks = this._callbacks.filter(cb => cb !== callback);
  }
});

const exposeValue = <T extends Exposable>(
  value: T,
  { scope = null }: { scope?: string | null } = {}
): { proxy: Remote<T>; stop(): void } => {
  const t1 = createMessageTarget();
  const t2 = createMessageTarget();
  const { stop } = expose({ value, from: t1, to: t2, scope });
  const proxy = createProxy<T>({ from: t1, to: t2, scope });
  // @ts-expect-error Type instantiation is excessively deep and possibly infinite.
  return { proxy, stop };
};

const scheduleTask = <R>(callback?: () => R) =>
  new Promise(resolve => setTimeout(() => resolve(callback?.())));

describe("transporter", () => {
  test("exposing undefined", async () => {
    const { proxy } = exposeValue(undefined as undefined);
    expect(await proxy).toEqual(undefined);
  });

  test("exposing a number", async () => {
    const { proxy } = exposeValue(1);
    expect(await proxy).toEqual(1);
  });

  test("exposing a boolean", async () => {
    const { proxy } = exposeValue(true);
    expect(await proxy).toEqual(true);
  });

  test("exposing a string", async () => {
    const { proxy } = exposeValue("🥸");
    expect(await proxy).toEqual("🥸");
  });

  test("exposing null", async () => {
    const { proxy } = exposeValue(null as null);
    expect(await proxy).toEqual(null);
  });

  test("exposing a function with no arguments or return value", async () => {
    const value = jest.fn();
    const { proxy } = exposeValue(value);
    await proxy();
    expect(value).toHaveBeenCalledTimes(1);
    expect(value).toHaveBeenCalledWith();
  });

  test("exposing an empty object", async () => {
    const { proxy } = exposeValue({});
    expect(await proxy).toEqual({});
  });

  test("exposing an empty array", async () => {
    const { proxy } = exposeValue([]);
    expect(await proxy).toEqual([]);
  });

  test("exposing an object with a property of type undefined", async () => {
    const { proxy } = exposeValue({ prop: undefined as undefined });
    expect(await proxy).toEqual({ prop: undefined });
  });

  test("exposing an object with a property of type number", async () => {
    const { proxy } = exposeValue({ prop: 12 });
    expect(await proxy).toEqual({ prop: 12 });
  });

  test("exposing an object with a property of type boolean", async () => {
    const { proxy } = exposeValue({ prop: false });
    expect(await proxy).toEqual({ prop: false });
  });

  test("exposing an object with a property of type string", async () => {
    const { proxy } = exposeValue({ prop: "🥸" });
    expect(await proxy).toEqual({ prop: "🥸" });
  });

  test("exposing an object with a property of type null", async () => {
    const { proxy } = exposeValue({ prop: null as null });
    expect(await proxy).toEqual({ prop: null });
  });

  test("exposing an object with a property of type function", async () => {
    const value = jest.fn();
    const { proxy } = exposeValue({ prop: value });
    await proxy.prop();
    expect(value).toHaveBeenCalledTimes(1);
    expect(value).toHaveBeenCalledWith();
  });

  test("exposing an array with an item of type undefined", async () => {
    const { proxy } = exposeValue([undefined as undefined]);
    expect(await proxy).toEqual([undefined]);
  });

  test("exposing an array with an item of type number", async () => {
    const { proxy } = exposeValue([23]);
    expect(await proxy).toEqual([23]);
  });

  test("exposing an array with an item of type boolean", async () => {
    const { proxy } = exposeValue([true]);
    expect(await proxy).toEqual([true]);
  });

  test("exposing an array with an item of type string", async () => {
    const { proxy } = exposeValue(["🥸"]);
    expect(await proxy).toEqual(["🥸"]);
  });

  test("exposing an array with an item of type null", async () => {
    const { proxy } = exposeValue([null as null]);
    expect(await proxy).toEqual([null]);
  });

  test("exposing an array with an item of type function", async () => {
    const value = jest.fn();
    const { proxy } = exposeValue([value]);
    await proxy[0]();
    expect(value).toHaveBeenCalledTimes(1);
    expect(value).toHaveBeenCalledWith();
  });

  test("dereferencing an exposed function returns a wrapper function", async () => {
    const value = jest.fn((arg: string) => ({ ok: arg }));
    const { proxy } = exposeValue(value);
    const wrappedValue = await proxy;

    expect(typeof wrappedValue).toBe("function");
    expect(value).not.toHaveBeenCalled();
    expect(await wrappedValue("🥸")).toEqual({ ok: "🥸" });
    expect(value).toHaveBeenCalledTimes(1);
    expect(value).toHaveBeenCalledWith("🥸");
  });

  test("exposing a complex object", async () => {
    const ab = jest.fn();
    const db2a = jest.fn();

    const { proxy } = exposeValue({
      a: { aa: null as null, ab },
      b: "🥸",
      c: 3,
      d: {
        da: undefined as undefined,
        db: [24, true, { db2a }]
      }
    });

    expect(await proxy.a.aa).toEqual(null);
    expect(await proxy.b).toEqual("🥸");
    expect(await proxy.c).toEqual(3);
    expect(await proxy.d.da).toEqual(undefined);
    expect(await proxy.d.db[0]).toEqual(24);
    expect(await proxy.d.db[1]).toEqual(true);

    await proxy.a.ab();
    // @ts-expect-error Property 'db2a' does not exist on type 'Promise<number>'
    await proxy.d.db[2].db2a();

    expect(ab).toHaveBeenCalledTimes(1);
    expect(ab).toHaveBeenCalledWith();
    expect(db2a).toHaveBeenCalledTimes(1);
    expect(db2a).toHaveBeenCalledWith();
  });

  test("calling an exposed function with an argument of type undefined", async () => {
    const value = jest.fn((_arg?: string) => {});
    const { proxy } = exposeValue(value);
    await proxy(undefined);
    expect(value).toHaveBeenCalledWith(undefined);
  });

  test("calling an exposed function with an argument of type number", async () => {
    const value = jest.fn((_arg: number) => {});
    const { proxy } = exposeValue(value);
    await proxy(2);
    expect(value).toHaveBeenCalledWith(2);
  });

  test("calling an exposed function with an argument of type boolean", async () => {
    const value = jest.fn((_arg: boolean) => {});
    const { proxy } = exposeValue(value);
    await proxy(false);
    expect(value).toHaveBeenCalledWith(false);
  });

  test("calling an exposed function with an argument of type string", async () => {
    const value = jest.fn((_arg: string) => {});
    const { proxy } = exposeValue(value);
    await proxy("🥸");
    expect(value).toHaveBeenCalledWith("🥸");
  });

  test("calling an exposed function with an argument of type null", async () => {
    const value = jest.fn((_arg: string | null) => {});
    const { proxy } = exposeValue(value);
    await proxy(null);
    expect(value).toHaveBeenCalledWith(null);
  });

  test("calling an exposed function with an argument of type object", async () => {
    const value = jest.fn((_arg: Record<string, unknown>) => {});
    const { proxy } = exposeValue(value);
    await proxy({ a: "a" });
    expect(value).toHaveBeenCalledWith({ a: "a" });
  });

  test("calling an exposed function with an argument of type array", async () => {
    const value = jest.fn((_arg: string[]) => {});
    const { proxy } = exposeValue(value);
    await proxy(["a", "b"]);
    expect(value).toHaveBeenCalledWith(["a", "b"]);
  });

  test("calling an exposed function with an argument of type function", async () => {
    const value = jest.fn((cb: () => void) => cb());
    const { proxy } = exposeValue(value);
    const callback = jest.fn();

    await proxy(callback);
    expect(value).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  test("callback arguments", async () => {
    const value = jest.fn((cb: (arg: string) => void) => cb("🥸"));
    const { proxy } = exposeValue(value);
    const callback = jest.fn();

    await proxy(callback);
    expect(value).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith("🥸");
  });

  test("callback chaining", async () => {
    const a = jest.fn(() => "🥸");
    const b = jest.fn(cb => cb());
    const c = jest.fn(cb => cb(a));
    const { proxy } = exposeValue(c);

    expect(await proxy(b)).toBe("🥸");
    expect(c).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
    expect(a).toHaveBeenCalledTimes(1);
  });

  test("calling an exposed function with a return value of type undefined", async () => {
    const { proxy } = exposeValue(jest.fn(() => {}));
    expect(await proxy()).toEqual(undefined);
  });

  test("calling an exposed function with a return value of type number", async () => {
    const { proxy } = exposeValue(jest.fn(() => 3));
    expect(await proxy()).toEqual(3);
  });

  test("calling an exposed function with a return value of type boolean", async () => {
    const { proxy } = exposeValue(jest.fn(() => true));
    expect(await proxy()).toEqual(true);
  });

  test("calling an exposed function with a return value of type string", async () => {
    const { proxy } = exposeValue(jest.fn(() => "🥸"));
    expect(await proxy()).toEqual("🥸");
  });

  test("calling an exposed function with a return value of type null", async () => {
    const { proxy } = exposeValue(jest.fn(() => null));
    expect(await proxy()).toEqual(null);
  });

  test("calling an exposed function with a return value of type object", async () => {
    const { proxy } = exposeValue(jest.fn(() => ({})));
    expect(await proxy()).toEqual({});
  });

  test("calling an exposed function with a return value of type array", async () => {
    const { proxy } = exposeValue(jest.fn(() => []));
    expect(await proxy()).toEqual([]);
  });

  test("calling an exposed function with a return value of type function", async () => {
    const { proxy } = exposeValue(jest.fn(() => () => {}));
    expect(typeof (await proxy())).toEqual("function");
  });

  test("return function chaining", async () => {
    const a = jest.fn(() => "🥸");
    const b = jest.fn(() => a);
    const c = jest.fn(() => b);
    const d = jest.fn(() => c);
    const { proxy } = exposeValue(d);

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

  test("scoping exposed values", async () => {
    const { proxy: proxyA } = exposeValue("a", { scope: "A" });
    const { proxy: proxyB } = exposeValue("b", { scope: "B" });

    expect(await proxyA).toEqual("a");
    expect(await proxyB).toEqual("b");
  });

  test("2-way exposure", async () => {
    const t1 = createMessageTarget();
    const t2 = createMessageTarget();

    expose({ value: "a", from: t1, to: t2 });
    expose({ value: "b", from: t2, to: t1 });

    const proxyA = createProxy({ from: t1, to: t2 });
    const proxyB = createProxy({ from: t2, to: t1 });

    expect(await proxyA).toEqual("a");
    expect(await proxyB).toEqual("b");
  });

  test("It only responds to messages with the correct scope and source", () => {
    const t1 = createMessageTarget();
    const t2 = createMessageTarget();
    const spy = jest.spyOn(t2, "postMessage");

    expose({ value: "a", from: t1, to: t2, scope: "A" });

    const message = {
      id: 1,
      path: [],
      scope: "B",
      source: "jest",
      type: "get"
    };

    t1.postMessage(JSON.stringify(message));
    expect(spy).not.toHaveBeenCalled();

    t1.postMessage(JSON.stringify({ ...message, scope: "A" }));
    expect(spy).not.toHaveBeenCalled();

    t1.postMessage(JSON.stringify({ ...message, source: "transporter" }));
    expect(spy).not.toHaveBeenCalled();

    t1.postMessage(
      JSON.stringify({ ...message, scope: "A", source: "transporter" })
    );

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(
      JSON.stringify({
        id: message.id,
        scope: "A",
        source: "transporter",
        type: "set",
        value: "a"
      })
    );
  });

  test("the promise will be rejected if a signal is not received in the allowed time", async () => {
    jest.useFakeTimers();

    const t1 = createMessageTarget();
    const t2 = createMessageTarget();
    const proxy = createProxy({ from: t1, timeout: 1000, to: t2 });
    // eslint-disable-next-line jest/valid-expect
    const assertion = expect(proxy).rejects.toThrow(TimeoutError);

    jest.advanceTimersByTime(1000);
    await assertion;
    jest.useRealTimers();
  });

  test("an exposed function that returns a promise will not cause a timeout error", async () => {
    jest.useFakeTimers();

    const { proxy } = exposeValue(
      () => new Promise(resolve => setTimeout(() => resolve("ok"), 2000))
    );

    // eslint-disable-next-line jest/valid-expect
    const assertion = expect(proxy()).resolves.toEqual("ok");

    jest.advanceTimersByTime(2000);
    await assertion;
    jest.useRealTimers();
  });

  test("transferred functions are garbage collected", async () => {
    const t1 = createMessageTarget();
    const t2 = createMessageTarget();
    const spy = jest.spyOn(t1, "postMessage");

    expose({ value: () => () => "🥸", from: t1, to: t2 });
    const proxy = createProxy<() => () => string>({ from: t1, to: t2 });
    let proxyFunc: (() => Promise<string>) | null = await proxy();

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

    proxyFunc = await proxy();
    expect(await proxyFunc()).toEqual("🥸");
  });
});
