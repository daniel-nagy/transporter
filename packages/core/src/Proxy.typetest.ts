import * as Proxy from "./Proxy.js";

test("non-function values are removed", () => {
  const _value = Proxy.from({ foo: "foo" });
  //    ^? const _value: {}
});

declare function test(message: string, callback: () => void): void;
