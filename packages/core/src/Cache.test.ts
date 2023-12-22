import { expect, test } from "bun:test";
import { spy } from "tinyspy";

import * as Cache from './Cache.js';

test("memoizing a function", () => {
  const fn = spy(() => ({ ok: "👌" }));
  const memo = Cache.init().memo(fn);
  expect(memo()).toBe(memo());
  expect(fn.callCount).toBe(1);
});

test("the function is called once if the arguments do not change", () => {
  const fn = spy((_user: { id: string }) => {});
  const memo = Cache.init().memo(fn);
  memo({ id: "foo" });
  memo({ id: "foo" });
  expect(fn.callCount).toBe(1);
});

test("the function is called again if the arguments change", () => {
  const fn = spy((user: { id: string }) => (user.id == "foo" ? "good" : "bad"));
  const memo = Cache.init().memo(fn);
  expect(memo({ id: "foo" })).toBe("good");
  expect(memo({ id: "bar" })).toBe("bad");
  expect(fn.callCount).toBe(2);
  expect(fn.calls).toEqual([[{ id: "foo" }], [{ id: "bar" }]]);
});

test("the function is called again if the function is removed from the cache", () => {
  const cache = Cache.init();
  const fn = spy(() => {});
  const memo = cache.memo(fn);
  memo();
  cache.remove(fn);
  memo();
  expect(fn.callCount).toBe(2);
});

test("updating a value in the cache", () => {
  const cache = Cache.init();
  const fn = spy(() => ({ foo: "foo" }));
  const memo = cache.memo(fn);
  expect(memo()).toEqual({ foo: "foo" });
  cache.update(fn, [], () => ({ foo: "bar" }));
  expect(memo()).toEqual({ foo: "bar" });
  expect(fn.callCount).toBe(1);
});

test("the update function is not called if the item is not in the cache", () => {
  const cache = Cache.init();
  const fn = () => ({ foo: "foo" });
  const memo = cache.memo(fn);
  const update = () => ({ foo: "bar" });
  cache.update(fn, [], update);
  expect(memo()).toEqual({ foo: "foo" });
});

test("the update function is called with the current item in the cache", () => {
  const cache = Cache.init();
  const fn = () => ({ foo: "foo" });
  const memo = cache.memo(fn);
  memo();
  const update = spy((_current: { foo: string }) => ({ foo: "bar" }));
  cache.update(fn, [], update);
  expect(update.calls).toEqual([[{ foo: "foo" }]]);
});

test("the cache returns NotFound if the item is not in the cache", () => {
  const cache = Cache.init();
  const fn = () => {};
  expect(cache.get(fn, [])).toBe(Cache.NotFound);
});

test("the cache returns the value if found (even if undefined)", () => {
  const cache = Cache.init();
  const fn = () => {};
  const memo = cache.memo(fn);
  memo();
  expect(cache.get(fn, [])).toBe(undefined);
});
