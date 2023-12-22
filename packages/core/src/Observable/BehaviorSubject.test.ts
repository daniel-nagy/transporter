import { expect, test } from "bun:test";
import { spy } from "tinyspy";

import { BehaviorSubject } from "./BehaviorSubject.js";

test("a behavior subject replays its value on subscribe", () => {
  const observable = new BehaviorSubject(3);
  const next = spy();
  observable.subscribe({ next });
  expect(next.callCount).toBe(1);
  expect(next.calls).toEqual([[3]]);
});

test("a behavior subject replays its last value on subscribe", () => {
  const observable = new BehaviorSubject(1);
  const next = spy();
  observable.next(2);
  observable.next(3);
  observable.subscribe({ next });
  expect(next.callCount).toBe(1);
  expect(next.calls).toEqual([[3]]);
});

test("subscribing to an errored behavior subject does not replay its value", () => {
  const observable = new BehaviorSubject(1);
  const error = spy();
  const next = spy();
  observable.error("💣");
  observable.subscribe({ next, error });
  expect(error.callCount).toBe(1);
  expect(error.calls).toEqual([["💣"]]);
  expect(next.called).toBe(false);
});

test("subscribing to a completed behavior subject does not replay its value", () => {
  const observable = new BehaviorSubject(1);
  const complete = spy();
  const next = spy();
  observable.complete();
  observable.subscribe({ complete, next });
  expect(complete.callCount).toBe(1);
  expect(complete.calls).toEqual([[]]);
  expect(next.called).toBe(false);
});

test("imperatively getting a behavior subject's value", () => {
  const observable = new BehaviorSubject(1);
  expect(observable.getValue()).toBe(1);
});

test("imperatively getting a completed behavior subject's value", () => {
  const observable = new BehaviorSubject(1);
  observable.complete();
  expect(observable.getValue()).toBe(1);
});

test("imperatively getting an errored behavior subject's value with throw", () => {
  const observable = new BehaviorSubject(1);
  observable.error("💣");
  expect(() => observable.getValue()).toThrow("💣");
});

// This behavior is different than RxJS v7.x
test("a behavior subject's value does not change after it is complete", () => {
  const observable = new BehaviorSubject(1);
  observable.complete();
  observable.next(2);
  expect(observable.getValue()).toBe(1);
});

test("as an observable", () => {
  const observable = new BehaviorSubject(99).asObservable();
  const next = spy();

  observable.subscribe(next);
  expect(next.callCount).toBe(1);
  expect(next.calls).toEqual([[99]]);
});
