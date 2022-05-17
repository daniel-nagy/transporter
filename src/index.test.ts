import {
  createModule,
  Exportable,
  ExternalMessageTarget,
  InternalMessageTarget,
  MessageSubscriber,
  RemoteExport,
  TimeoutError,
  useModule,
} from "./index";

declare namespace globalThis {
  const gc: () => void;
}

type MessageTarget = ExternalMessageTarget & InternalMessageTarget;

const createMessageTarget = (): MessageTarget => {
  let callbacks: MessageSubscriber[] = [];

  return {
    addEventListener(_type: "message", callback: MessageSubscriber) {
      callbacks = [...callbacks, callback];
    },
    postMessage(message: string) {
      callbacks.forEach((callback) =>
        callback({ data: message, source: { postMessage() {} } })
      );
    },
    removeEventListener(_type: "message", callback: MessageSubscriber) {
      callbacks = callbacks.filter((cb) => cb !== callback);
    },
  };
};

const withSource = <T extends InternalMessageTarget>(
  messageTarget: T,
  source: ExternalMessageTarget
): T => {
  const { addEventListener, removeEventListener } = messageTarget;
  const callbackMap = new WeakMap<MessageSubscriber, MessageSubscriber>();

  return Object.assign(messageTarget, {
    addEventListener(_type: "message", callback: MessageSubscriber) {
      const wrappedCallback: MessageSubscriber = (event) =>
        callback({ ...event, source });
      callbackMap.set(callback, wrappedCallback);
      addEventListener("message", wrappedCallback);
    },
    removeEventListener(_type: "message", callback: MessageSubscriber) {
      const wrappedCallback = callbackMap.get(callback);
      removeEventListener("message", wrappedCallback ?? callback);
    },
  });
};

const createMessageChannel = () => {
  const t1 = createMessageTarget();
  const t2 = createMessageTarget();
  return [withSource(t1, t2), withSource(t2, t1)];
};

const exportValue = <T extends Exportable>(
  value: T,
  { namespace = null }: { namespace?: string | null } = {}
): { proxy: RemoteExport<T>; release(): void } => {
  const [t1, t2] = createMessageChannel();

  const { release } = createModule({
    export: { default: value },
    from: t1,
    namespace,
  });

  const { default: remoteValue } = useModule<{ default: T }>({
    from: t1,
    to: t2,
    namespace,
  });

  return { proxy: remoteValue, release };
};

const scheduleTask = <R>(callback?: () => R) =>
  new Promise((resolve) => setTimeout(() => resolve(callback?.())));

describe("transporter", () => {
  test("exporting undefined", async () => {
    const { proxy } = exportValue(undefined as undefined);
    expect(await proxy).toEqual(undefined);
  });

  test("exporting a number", async () => {
    const { proxy } = exportValue(1);
    expect(await proxy).toEqual(1);
  });

  test("exporting a boolean", async () => {
    const { proxy } = exportValue(true);
    expect(await proxy).toEqual(true);
  });

  test("exporting a string", async () => {
    const { proxy } = exportValue("🥸");
    expect(await proxy).toEqual("🥸");
  });

  test("exporting null", async () => {
    const { proxy } = exportValue(null as null);
    expect(await proxy).toEqual(null);
  });

  test("exporting a function with no arguments or return value", async () => {
    const value = jest.fn();
    const { proxy } = exportValue(value);
    await proxy();
    expect(value).toHaveBeenCalledTimes(1);
    expect(value).toHaveBeenCalledWith();
  });

  test("exporting an empty object", async () => {
    const { proxy } = exportValue({});
    expect(await proxy).toEqual({});
  });

  test("exporting an empty array", async () => {
    const { proxy } = exportValue([]);
    expect(await proxy).toEqual([]);
  });

  test("exporting an object with a property of type undefined", async () => {
    const { proxy } = exportValue({ prop: undefined as undefined });
    expect(await proxy).toEqual({ prop: undefined });
  });

  test("exporting an object with a property of type number", async () => {
    const { proxy } = exportValue({ prop: 12 });
    expect(await proxy).toEqual({ prop: 12 });
  });

  test("exporting an object with a property of type boolean", async () => {
    const { proxy } = exportValue({ prop: false });
    expect(await proxy).toEqual({ prop: false });
  });

  test("exporting an object with a property of type string", async () => {
    const { proxy } = exportValue({ prop: "🥸" });
    expect(await proxy).toEqual({ prop: "🥸" });
  });

  test("exporting an object with a property of type null", async () => {
    const { proxy } = exportValue({ prop: null as null });
    expect(await proxy).toEqual({ prop: null });
  });

  test("exporting an object with a property of type function", async () => {
    const value = jest.fn();
    const { proxy } = exportValue({ prop: value });
    (await proxy).prop();
    expect(value).toHaveBeenCalledTimes(1);
    expect(value).toHaveBeenCalledWith();
  });

  test("exporting an array with an item of type undefined", async () => {
    const { proxy } = exportValue([undefined as undefined]);
    expect(await proxy).toEqual([undefined]);
  });

  test("exporting an array with an item of type number", async () => {
    const { proxy } = exportValue([23]);
    expect(await proxy).toEqual([23]);
  });

  test("exporting an array with an item of type boolean", async () => {
    const { proxy } = exportValue([true]);
    expect(await proxy).toEqual([true]);
  });

  test("exporting an array with an item of type string", async () => {
    const { proxy } = exportValue(["🥸"]);
    expect(await proxy).toEqual(["🥸"]);
  });

  test("exporting an array with an item of type null", async () => {
    const { proxy } = exportValue([null as null]);
    expect(await proxy).toEqual([null]);
  });

  test("exporting an array with an item of type function", async () => {
    const value = jest.fn();
    const { proxy } = exportValue([value]);
    (await proxy)[0]();
    expect(value).toHaveBeenCalledTimes(1);
    expect(value).toHaveBeenCalledWith();
  });

  test("executing a lazy promise on an exported function creates a new proxy for the same function", async () => {
    const value = jest.fn((arg: string) => ({ ok: arg }));
    const { proxy } = exportValue(value);
    const newValue = await proxy;

    expect(value).not.toHaveBeenCalled();
    expect(await newValue("🥸")).toEqual({ ok: "🥸" });
    expect(value).toHaveBeenCalledTimes(1);
    expect(value).toHaveBeenCalledWith("🥸");
  });

  test("exporting a complex object", async () => {
    const ab = jest.fn();
    const db2a = jest.fn();

    const { proxy } = exportValue({
      a: { aa: null as null, ab },
      b: "🥸",
      c: 3,
      d: {
        da: undefined as undefined,
        db: [24, true, { db2a }],
      },
    });

    const value = await proxy;

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

  test("destructuring named exports", async () => {
    const [t1, t2] = createMessageChannel();
    createModule({ export: { a: "a", b: "b", c: "c" }, from: t1 });
    const proxy = useModule<{ a: "a"; b: "b"; c: "c" }>({ from: t1, to: t2 });
    const { a, b, c } = proxy;

    expect(await a).toEqual("a");
    expect(await b).toEqual("b");
    expect(await c).toEqual("c");
  });

  test("enumerating named exports throws a TypeError", () => {
    const [t1, t2] = createMessageChannel();
    createModule({ export: { a: "a", b: "b", c: "c" }, from: t1 });
    const proxy = useModule<{ a: "a"; b: "b"; c: "c" }>({ from: t1, to: t2 });

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

  test("calling an exported function with an argument of type undefined", async () => {
    const value = jest.fn((_arg?: string) => {});
    const { proxy } = exportValue(value);
    await proxy(undefined);
    expect(value).toHaveBeenCalledWith(undefined);
  });

  test("calling an exported function with an argument of type number", async () => {
    const value = jest.fn((_arg: number) => {});
    const { proxy } = exportValue(value);
    await proxy(2);
    expect(value).toHaveBeenCalledWith(2);
  });

  test("calling an exported function with an argument of type boolean", async () => {
    const value = jest.fn((_arg: boolean) => {});
    const { proxy } = exportValue(value);
    await proxy(false);
    expect(value).toHaveBeenCalledWith(false);
  });

  test("calling an exported function with an argument of type string", async () => {
    const value = jest.fn((_arg: string) => {});
    const { proxy } = exportValue(value);
    await proxy("🥸");
    expect(value).toHaveBeenCalledWith("🥸");
  });

  test("calling an exported function with an argument of type null", async () => {
    const value = jest.fn((_arg: string | null) => {});
    const { proxy } = exportValue(value);
    await proxy(null);
    expect(value).toHaveBeenCalledWith(null);
  });

  test("calling an exported function with an argument of type object", async () => {
    const value = jest.fn((_arg: Record<string, unknown>) => {});
    const { proxy } = exportValue(value);
    await proxy({ a: "a" });
    expect(value).toHaveBeenCalledWith({ a: "a" });
  });

  test("calling an exported function with an argument of type array", async () => {
    const value = jest.fn((_arg: string[]) => {});
    const { proxy } = exportValue(value);
    await proxy(["a", "b"]);
    expect(value).toHaveBeenCalledWith(["a", "b"]);
  });

  test("calling an exported function with an argument of type function", async () => {
    const value = jest.fn((cb: () => void) => cb());
    const { proxy } = exportValue(value);
    const callback = jest.fn();

    await proxy(callback);
    expect(value).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  test("calling an exported function that throws an error", async () => {
    const value = jest.fn(() => {
      throw "💣";
    });

    const { proxy } = exportValue(value);

    await expect(proxy).rejects.toBe("💣");
  });

  test("callback arguments", async () => {
    const value = jest.fn((cb: (arg: string) => void) => cb("🥸"));
    const { proxy } = exportValue(value);
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
    const { proxy } = exportValue(c);

    expect(await proxy(b)).toBe("🥸");
    expect(c).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
    expect(a).toHaveBeenCalledTimes(1);
  });

  test("calling an exported function with a return value of type undefined", async () => {
    const { proxy } = exportValue(jest.fn(() => {}));
    expect(await proxy()).toEqual(undefined);
  });

  test("calling an exported function with a return value of type number", async () => {
    const { proxy } = exportValue(jest.fn(() => 3));
    expect(await proxy()).toEqual(3);
  });

  test("calling an exported function with a return value of type boolean", async () => {
    const { proxy } = exportValue(jest.fn(() => true));
    expect(await proxy()).toEqual(true);
  });

  test("calling an exported function with a return value of type string", async () => {
    const { proxy } = exportValue(jest.fn(() => "🥸"));
    expect(await proxy()).toEqual("🥸");
  });

  test("calling an exported function with a return value of type null", async () => {
    const { proxy } = exportValue(jest.fn(() => null));
    expect(await proxy()).toEqual(null);
  });

  test("calling an exported function with a return value of type object", async () => {
    const { proxy } = exportValue(jest.fn(() => ({})));
    expect(await proxy()).toEqual({});
  });

  test("calling an exported function with a return value of type array", async () => {
    const { proxy } = exportValue(jest.fn(() => []));
    expect(await proxy()).toEqual([]);
  });

  test("calling an exported function with a return value of type function", async () => {
    const { proxy } = exportValue(jest.fn(() => () => {}));
    expect(typeof (await proxy())).toEqual("function");
  });

  test("return function chaining", async () => {
    const a = jest.fn(() => "🥸");
    const b = jest.fn(() => a);
    const c = jest.fn(() => b);
    const d = jest.fn(() => c);
    const { proxy } = exportValue(d);

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
    const { proxy } = exportValue(jest.fn(sum));

    expect(await proxy(1, 2, 3)).toEqual(6);
    expect(await proxy(...[1, 2, 3])).toEqual(6);
  });

  test("function apply", async () => {
    const sum = (...numbers: number[]) =>
      numbers.reduce((sum, num) => sum + num, 0);
    const { proxy } = exportValue(jest.fn(sum));

    expect(await proxy.apply(proxy, [1, 2, 3])).toEqual(6);
  });

  test("function apply with a different this arg", async () => {
    const { proxy } = exportValue(
      jest.fn(function test(this: any) {
        return this;
      })
    );
    expect(await proxy.apply({ a: "a" })).toEqual({ a: "a" });
  });

  test("function bind", async () => {
    const { proxy } = exportValue(
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
    const { proxy } = exportValue(jest.fn(sum));

    expect(await proxy.call(proxy, 1, 2, 3)).toEqual(6);
  });

  test("function call with a different this arg", async () => {
    const { proxy } = exportValue(
      jest.fn(function test(this: any) {
        return this;
      })
    );
    expect(await proxy.call({ a: "a" })).toEqual({ a: "a" });
  });

  test("namespaced exported values", async () => {
    const { proxy: proxyA } = exportValue("a", { namespace: "A" });
    const { proxy: proxyB } = exportValue("b", { namespace: "B" });

    expect(await proxyA).toEqual("a");
    expect(await proxyB).toEqual("b");
  });

  test("bidirectional modules", async () => {
    const [t1, t2] = createMessageChannel();

    createModule({ export: { default: "a" }, from: t1 });
    createModule({ export: { default: "b" }, from: t2 });

    const proxyA = useModule<{ default: string }>({ from: t1, to: t2 });
    const proxyB = useModule<{ default: string }>({ from: t2, to: t1 });

    expect(await proxyA.default).toEqual("a");
    expect(await proxyB.default).toEqual("b");
  });

  test("messages must have the correct scope and source", () => {
    const [t1, t2] = createMessageChannel();
    const spy = jest.spyOn(t2, "postMessage");

    createModule({ export: { default: "a" }, from: t1, namespace: "A" });

    const message = {
      id: 1,
      path: ["default"],
      scope: "B",
      source: "jest",
      type: "get",
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
        value: "a",
      })
    );
  });

  test("the promise will be rejected if a signal is not received in the allowed time", async () => {
    jest.useFakeTimers();

    const [t1, t2] = createMessageChannel();
    const proxy = useModule({ from: t1, timeout: 1000, to: t2 });
    const assertion = expect(proxy).rejects.toThrow(TimeoutError);

    jest.advanceTimersByTime(1000);
    await assertion;
    jest.useRealTimers();
  });

  test("an exported function that returns a promise will not cause a timeout error", async () => {
    jest.useFakeTimers();

    const { proxy } = exportValue(
      () => new Promise((resolve) => setTimeout(() => resolve("ok"), 2000))
    );

    const assertion = expect(proxy()).resolves.toEqual("ok");

    jest.advanceTimersByTime(2000);
    await assertion;
    jest.useRealTimers();
  });

  test("transferred functions are garbage collected", async () => {
    const [t1, t2] = createMessageChannel();
    const spy = jest.spyOn(t1, "postMessage");

    createModule({ export: { default: () => () => "🥸" }, from: t1 });

    const proxy = useModule<{ default: () => () => string }>({
      from: t1,
      to: t2,
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
