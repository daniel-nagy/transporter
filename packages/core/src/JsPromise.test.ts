import { expect, test } from "bun:test";

import * as JsPromise from "./JsPromise.js";

test("checking if a promise is a promise", () => {
  expect(JsPromise.isPromise(Promise.resolve("👌"))).toBe(true);
});

test("checking if a value with a then method is a promise", () => {
  expect(JsPromise.isPromise({ then() {} })).toBe(true);
});
