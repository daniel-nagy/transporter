import {
  createModule,
  MessagePortLike,
  MessagingContext,
  ModuleExport,
  RemoteValue,
  TimeoutError,
  useModule,
} from ".";
import { createMessageChannel } from "./messageChannel";
import {
  BehaviorSubject,
  firstValueFrom,
  Observable,
  ObservableLike,
} from "./Observable";
import { virtualConnection, virtualContext } from "./virtual";

declare namespace globalThis {
  const gc: () => void;
}

describe("transporter", () => {
  test("exporting an observable of type undefined", async () => {
    const { proxy } = exportValue(undefined as undefined);
    expect(await firstValueFrom(proxy)).toEqual(undefined);
  });

  test("exporting an observable of type number", async () => {
    const { proxy } = exportValue(1);
    expect(await firstValueFrom(proxy)).toEqual(1);
  });

  test("exporting an observable of type boolean", async () => {
    const { proxy } = exportValue(true);
    expect(await firstValueFrom(proxy)).toEqual(true);
  });

  test("exporting an observable of type string", async () => {
    const { proxy } = exportValue("🥸");
    expect(await firstValueFrom(proxy)).toEqual("🥸");
  });

  test("exporting an observable of type null", async () => {
    const { proxy } = exportValue(null as null);
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
    const { proxy } = exportValue({});
    expect(await firstValueFrom(proxy)).toEqual({});
  });

  test("exporting an observable of type array", async () => {
    const { proxy } = exportValue([]);
    expect(await firstValueFrom(proxy)).toEqual([]);
  });

  test("exporting an observable of type object with a property of type undefined", async () => {
    const { proxy } = exportValue({ prop: undefined as undefined });
    expect(await firstValueFrom(proxy)).toEqual({ prop: undefined });
  });

  test("exporting an observable of type object with a property of type number", async () => {
    const { proxy } = exportValue({ prop: 12 });
    expect(await firstValueFrom(proxy)).toEqual({ prop: 12 });
  });

  test("exporting an observable of type object with a property of type boolean", async () => {
    const { proxy } = exportValue({ prop: false });
    expect(await firstValueFrom(proxy)).toEqual({ prop: false });
  });

  test("exporting an observable of type object with a property of type string", async () => {
    const { proxy } = exportValue({ prop: "🥸" });
    expect(await firstValueFrom(proxy)).toEqual({ prop: "🥸" });
  });

  test("exporting an observable of type object with a property of type null", async () => {
    const { proxy } = exportValue({ prop: null as null });
    expect(await firstValueFrom(proxy)).toEqual({ prop: null });
  });

  test("exporting an observable of type object with a property of type function", async () => {
    const value = jest.fn();
    const { proxy } = exportValue({ prop: value });
    (await firstValueFrom(proxy)).prop();
    expect(value).toHaveBeenCalledTimes(1);
    expect(value).toHaveBeenCalledWith();
  });

  test("exporting an observable of type array with an item of type undefined", async () => {
    const { proxy } = exportValue([undefined as undefined]);
    expect(await firstValueFrom(proxy)).toEqual([undefined]);
  });

  test("exporting an observable of type array with an item of type number", async () => {
    const { proxy } = exportValue([23]);
    expect(await firstValueFrom(proxy)).toEqual([23]);
  });

  test("exporting an observable of type array with an item of type boolean", async () => {
    const { proxy } = exportValue([true]);
    expect(await firstValueFrom(proxy)).toEqual([true]);
  });

  test("exporting an observable of type array with an item of type string", async () => {
    const { proxy } = exportValue(["🥸"]);
    expect(await firstValueFrom(proxy)).toEqual(["🥸"]);
  });

  test("exporting an observable of type array with an item of type null", async () => {
    const { proxy } = exportValue([null as null]);
    expect(await firstValueFrom(proxy)).toEqual([null]);
  });

  test("exporting an observable of type array with an item of type function", async () => {
    const value = jest.fn();
    const { proxy } = exportValue([value]);
    (await firstValueFrom(proxy))[0]();
    expect(value).toHaveBeenCalledTimes(1);
    expect(value).toHaveBeenCalledWith();
  });

  test("exporting an observable of type object with many properties of different types", async () => {
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

  test("explicitly exporting an observable", async () => {
    const { proxy } = exportValue(Observable.of(42));
    expect(await firstValueFrom(proxy)).toEqual(42);
  });

  test("subscribing to an exported observable that emits values overtime", async () => {
    const subject = new BehaviorSubject(1);
    const { proxy } = exportValue(subject.asObservable());
    const next = jest.fn();

    proxy.subscribe(next);
    subject.next(2);
    await scheduleTask(() => subject.next(3));
    expect(next).toHaveBeenCalledTimes(3);
    expect(next).toHaveBeenCalledWith(1);
    expect(next).toHaveBeenCalledWith(2);
    expect(next).toHaveBeenCalledWith(3);
  });

  test("destructuring named exports", async () => {
    const [p1, p2] = createMessageChannel();

    createModule({
      export: { a: "a", b: "b", c: () => "c" },
      within: portContext(p1),
    });

    const proxy = useModule<{
      a: ObservableLike<"a">;
      b: ObservableLike<"b">;
      c: () => "c";
    }>({
      from: p2,
    });

    const { a, b, c } = proxy;

    expect(await firstValueFrom(a)).toEqual("a");
    expect(await firstValueFrom(b)).toEqual("b");
    expect(await c()).toEqual("c");
  });

  test("enumerating named exports throws a TypeError", () => {
    const [p1, p2] = createMessageChannel();

    createModule({
      export: { a: "a", b: "b", c: () => "c" },
      within: portContext(p1),
    });

    const proxy = useModule<{
      a: ObservableLike<"a">;
      b: ObservableLike<"b">;
      c: () => "c";
    }>({
      from: p2,
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

  test("namespaced modules in a single messaging context", async () => {
    createModule({
      export: { default: "a" },
      namespace: "A",
      within: virtualContext(),
    });

    createModule({
      export: { default: "b" },
      namespace: "B",
      within: virtualContext(),
    });

    const { default: A } = useModule<{ default: "a" }>({
      from: virtualConnection(),
      namespace: "A",
    });

    const { default: B } = useModule<{ default: "b" }>({
      from: virtualConnection(),
      namespace: "B",
    });

    expect(await firstValueFrom(A)).toEqual("a");
    expect(await firstValueFrom(B)).toEqual("b");
  });

  test("using the same module more than once in a single messaging context", async () => {
    createModule({
      export: { default: "a" },
      namespace: "A",
      within: virtualContext(),
    });

    const { default: A0 } = useModule<{ default: "a" }>({
      from: virtualConnection(),
      namespace: "A",
    });

    const { default: A1 } = useModule<{ default: "a" }>({
      from: virtualConnection(),
      namespace: "A",
    });

    expect(await firstValueFrom(A0)).toEqual("a");
    expect(await firstValueFrom(A1)).toEqual("a");
  });

  test("bidirectional modules", async () => {
    const [p1, p2] = createMessageChannel();

    createModule({ export: { default: "a" }, within: portContext(p1) });
    createModule({ export: { default: "b" }, within: portContext(p2) });

    const A = useModule<{ default: ObservableLike<"a"> }>({ from: p2 });
    const B = useModule<{ default: ObservableLike<"b"> }>({ from: p1 });

    expect(await firstValueFrom(A.default)).toEqual("a");
    expect(await firstValueFrom(B.default)).toEqual("b");
  });

  test("messages must have the correct scope and source", async () => {
    const [p1, p2] = createMessageChannel();
    const spy = jest.spyOn(p1, "postMessage");

    createModule({
      export: { default: "a" },
      namespace: "A",
      within: portContext(p1),
    });

    const message = {
      args: [JSON.stringify({ type: "function" })],
      id: 1,
      path: ["default", "subscribe"],
      scope: "B",
      source: "jest",
      type: "call",
    };

    p2.postMessage(JSON.stringify(message));
    await scheduleTask();
    expect(spy).not.toHaveBeenCalled();

    p2.postMessage(JSON.stringify({ ...message, scope: "A" }));
    await scheduleTask();
    expect(spy).not.toHaveBeenCalled();

    p2.postMessage(JSON.stringify({ ...message, source: "transporter" }));
    await scheduleTask();
    expect(spy).not.toHaveBeenCalled();

    p2.postMessage(
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
          scope: expect.stringMatching(/[\da-z]{9}/),
          type: "function",
        },
      },
    });
  });

  test("the promise will be rejected if a signal is not received in the allowed time", async () => {
    jest.useFakeTimers();

    const [, p2] = createMessageChannel();
    const proxy = useModule({ from: p2, timeout: 1000 });
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
    const [p1, p2] = createMessageChannel();
    const spy = jest.spyOn(p2, "postMessage");

    createModule({
      export: { default: () => () => "🥸" },
      within: portContext(p1),
    });

    const proxy = useModule<{ default: () => () => string }>({
      from: p2,
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

function exportValue<T extends ModuleExport>(
  value: T,
  { namespace = null }: { namespace?: string | null } = {}
): { proxy: RemoteValue<T>; release(): void } {
  const [p1, p2] = createMessageChannel();

  const { release } = createModule({
    export: { default: value },
    namespace,
    within: portContext(p1),
  });

  const { default: remoteValue } = useModule<{ default: T }>({
    from: p2,
    namespace,
  });

  return { proxy: remoteValue, release };
}

function portContext(port: MessagePortLike): MessagingContext {
  return (createConnection) => createConnection(port);
}

function scheduleTask<R>(callback?: () => R) {
  return new Promise((resolve) => setTimeout(() => resolve(callback?.())));
}
