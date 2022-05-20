import {
  createModule,
  ExternalMessageTarget,
  InternalMessageTarget,
  MessageSubscriber,
  NamedExport,
  RemoteExport,
  TimeoutError,
  useModule,
} from "./index";
import { firstValueFrom, Observable, ObservableLike } from "./Observable";

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

const exportValue = <T extends NamedExport>(
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
  test("exporting an observable of type undefined", async () => {
    const { proxy } = exportValue(Observable.of(undefined as undefined));
    expect(await firstValueFrom(proxy)).toEqual(undefined);
  });

  test("exporting an observable of type number", async () => {
    const { proxy } = exportValue(Observable.of(1));
    expect(await firstValueFrom(proxy)).toEqual(1);
  });

  test("exporting an observable of type boolean", async () => {
    const { proxy } = exportValue(Observable.of(true));
    expect(await firstValueFrom(proxy)).toEqual(true);
  });

  test("exporting an observable of type string", async () => {
    const { proxy } = exportValue(Observable.of("🥸"));
    expect(await firstValueFrom(proxy)).toEqual("🥸");
  });

  test("exporting an observable of type null", async () => {
    const { proxy } = exportValue(Observable.of(null as null));
    expect(await firstValueFrom(proxy)).toEqual(null);
  });

  test("exporting a function with no arguments or return value", async () => {
    const value = jest.fn();
    const { proxy } = exportValue(value);
    await proxy();
    expect(value).toHaveBeenCalledTimes(1);
    expect(value).toHaveBeenCalledWith();
  });

  test("exporting an observable of type object", async () => {
    const { proxy } = exportValue(Observable.of({}));
    expect(await firstValueFrom(proxy)).toEqual({});
  });

  test("exporting an observable of type array", async () => {
    const { proxy } = exportValue(Observable.of([]));
    expect(await firstValueFrom(proxy)).toEqual([]);
  });

  test("exporting an observable of type object with a property of type undefined", async () => {
    const { proxy } = exportValue(
      Observable.of({ prop: undefined as undefined })
    );
    expect(await firstValueFrom(proxy)).toEqual({ prop: undefined });
  });

  test("exporting an observable of type object with a property of type number", async () => {
    const { proxy } = exportValue(Observable.of({ prop: 12 }));
    expect(await firstValueFrom(proxy)).toEqual({ prop: 12 });
  });

  test("exporting an observable of type object with a property of type boolean", async () => {
    const { proxy } = exportValue(Observable.of({ prop: false }));
    expect(await firstValueFrom(proxy)).toEqual({ prop: false });
  });

  test("exporting an observable of type object with a property of type string", async () => {
    const { proxy } = exportValue(Observable.of({ prop: "🥸" }));
    expect(await firstValueFrom(proxy)).toEqual({ prop: "🥸" });
  });

  test("exporting an observable of type object with a property of type null", async () => {
    const { proxy } = exportValue(Observable.of({ prop: null as null }));
    expect(await firstValueFrom(proxy)).toEqual({ prop: null });
  });

  test("exporting an observable of type object with a property of type function", async () => {
    const value = jest.fn();
    const { proxy } = exportValue(Observable.of({ prop: value }));
    (await firstValueFrom(proxy)).prop();
    expect(value).toHaveBeenCalledTimes(1);
    expect(value).toHaveBeenCalledWith();
  });

  test("exporting an observable of type array with an item of type undefined", async () => {
    const { proxy } = exportValue(Observable.of([undefined as undefined]));
    expect(await firstValueFrom(proxy)).toEqual([undefined]);
  });

  test("exporting an observable of type array with an item of type number", async () => {
    const { proxy } = exportValue(Observable.of([23]));
    expect(await firstValueFrom(proxy)).toEqual([23]);
  });

  test("exporting an observable of type array with an item of type boolean", async () => {
    const { proxy } = exportValue(Observable.of([true]));
    expect(await firstValueFrom(proxy)).toEqual([true]);
  });

  test("exporting an observable of type array with an item of type string", async () => {
    const { proxy } = exportValue(Observable.of(["🥸"]));
    expect(await firstValueFrom(proxy)).toEqual(["🥸"]);
  });

  test("exporting an observable of type array with an item of type null", async () => {
    const { proxy } = exportValue(Observable.of([null as null]));
    expect(await firstValueFrom(proxy)).toEqual([null]);
  });

  test("exporting an observable of type array with an item of type function", async () => {
    const value = jest.fn();
    const { proxy } = exportValue(Observable.of([value]));
    (await firstValueFrom(proxy))[0]();
    expect(value).toHaveBeenCalledTimes(1);
    expect(value).toHaveBeenCalledWith();
  });

  test("exporting an observable of type object with many properties of different types", async () => {
    const ab = jest.fn();
    const db2a = jest.fn();

    const { proxy } = exportValue(
      Observable.of({
        a: { aa: null as null, ab },
        b: "🥸",
        c: 3,
        d: {
          da: undefined as undefined,
          db: [24, true, { db2a }],
        },
      })
    );

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

  test("destructuring named exports", async () => {
    const [t1, t2] = createMessageChannel();

    createModule({
      export: {
        a: Observable.of("a"),
        b: Observable.of("b"),
        c: () => "c",
      },
      from: t1,
    });

    const proxy = useModule<{
      a: ObservableLike<"a">;
      b: ObservableLike<"b">;
      c: () => "c";
    }>({
      from: t1,
      to: t2,
    });

    const { a, b, c } = proxy;

    expect(await firstValueFrom(a)).toEqual("a");
    expect(await firstValueFrom(b)).toEqual("b");
    expect(await c()).toEqual("c");
  });

  test("enumerating named exports throws a TypeError", () => {
    const [t1, t2] = createMessageChannel();

    createModule({
      export: {
        a: Observable.of("a"),
        b: Observable.of("b"),
        c: () => "c",
      },
      from: t1,
    });

    const proxy = useModule<{
      a: ObservableLike<"a">;
      b: ObservableLike<"b">;
      c: () => "c";
    }>({
      from: t1,
      to: t2,
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

  test("namespaced module exports", async () => {
    const { proxy: A } = exportValue(Observable.of("a"), { namespace: "A" });
    const { proxy: B } = exportValue(Observable.of("b"), { namespace: "B" });

    expect(await firstValueFrom(A)).toEqual("a");
    expect(await firstValueFrom(B)).toEqual("b");
  });

  test("bidirectional modules", async () => {
    const [t1, t2] = createMessageChannel();

    createModule({ export: { default: Observable.of("a") }, from: t1 });
    createModule({ export: { default: Observable.of("b") }, from: t2 });

    const A = useModule<{ default: ObservableLike<"a"> }>({ from: t1, to: t2 });
    const B = useModule<{ default: ObservableLike<"b"> }>({ from: t2, to: t1 });

    expect(await firstValueFrom(A.default)).toEqual("a");
    expect(await firstValueFrom(B.default)).toEqual("b");
  });

  test("messages must have the correct scope and source", async () => {
    const [t1, t2] = createMessageChannel();
    const spy = jest.spyOn(t2, "postMessage");

    createModule({
      export: { default: Observable.of("a") },
      from: t1,
      namespace: "A",
    });

    const message = {
      args: [JSON.stringify({ type: "function" })],
      id: 1,
      path: ["default", "subscribe"],
      scope: "B",
      source: "jest",
      type: "call",
    };

    t1.postMessage(JSON.stringify(message));
    await scheduleTask();
    expect(spy).not.toHaveBeenCalled();

    t1.postMessage(JSON.stringify({ ...message, scope: "A" }));
    await scheduleTask();
    expect(spy).not.toHaveBeenCalled();

    t1.postMessage(JSON.stringify({ ...message, source: "transporter" }));
    await scheduleTask();
    expect(spy).not.toHaveBeenCalled();

    t1.postMessage(
      JSON.stringify({ ...message, scope: "A", source: "transporter" })
    );

    await scheduleTask();
    expect(spy).toHaveBeenCalledTimes(1);
    expect(JSON.parse(spy.mock.calls[0][0])).toEqual({
      id: message.id,
      scope: "A",
      source: "transporter",
      type: "set",
      value: {
        unsubscribe: {
          isPromiseLike: false,
          scope: expect.stringMatching(/[\da-z]{9}/),
          type: "function",
        },
      },
    });
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

  test("exported functions are garbage collected", async () => {
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
