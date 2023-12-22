import {
  type InstalledClock,
  install as useFakeTimers
} from "@sinonjs/fake-timers";
import { afterEach, beforeEach, expect, test } from "bun:test";
import { spy, spyOn } from "tinyspy";

import { fail } from "./fail.js";
import { Observable } from "./Observable.js";
import { timeout } from "./timeout.js";

let clock: InstalledClock;

beforeEach(() => {
  clock = useFakeTimers();
});

afterEach(() => {
  clock.uninstall();
});

test("the observable errors if a value is not emitted in the time limit", () => {
  const observable = new Observable(() => {});
  observable.pipe(timeout(1000)).subscribe();
  expect(() => clock.tick(999)).not.toThrow();
  expect(() => clock.tick(1)).toThrow();
});

test("the timer is reset each time a value is emitted", () => {
  const observable = new Observable(({ next }) => {
    setTimeout(() => next?.("🦸‍♀️"), 500);
  });

  observable.pipe(timeout(1000)).subscribe();
  expect(() => clock.tick(1000)).not.toThrow();
  expect(() => clock.tick(1500)).toThrow();
});

test("a callback can return a new observable", () => {
  const next = spy();
  const observable = new Observable(() => {});
  observable.pipe(timeout(1000, () => Observable.of("🥷"))).subscribe(next);
  expect(() => clock.tick(1000)).not.toThrow();
  expect(next.calls).toEqual([["🥷"]]);
});

test("a new observable does not automatically timeout", () => {
  const observable = new Observable(() => {});
  observable.pipe(timeout(1000, () => new Observable(() => {}))).subscribe();
  expect(() => clock.tick(2000)).not.toThrow();
});

test("a negative timeout is equivalent to a timeout of 0", () => {
  const observable = new Observable(() => {});
  observable.pipe(timeout(-500)).subscribe();
  expect(() => clock.tick(0)).toThrow();
});

test("does not swallow errors", () => {
  const observable = fail("💣");
  expect(() => observable.pipe(timeout(1000)).subscribe()).toThrow("💣");
});

test("does not raise a timeout error if the observable completes", () => {
  const observable = Observable.of("🐶");
  observable.pipe(timeout(1000)).subscribe();
  expect(() => clock.tick(1000)).not.toThrow();
});

test("the timer is stopped if the observable errors", () => {
  const setTimeoutSpy = spyOn(global, "setTimeout");
  const observable = fail(() => "💣");

  try {
    observable.pipe(timeout(1000)).subscribe();
  } catch (_) {
    // empty
  }

  expect(setTimeoutSpy.callCount).toBe(1);
});

test("the timer is stopped if the observable completes", () => {
  const setTimeoutSpy = spyOn(global, "setTimeout");
  const observable = new Observable(({ complete }) => complete?.());
  observable.pipe(timeout(1000)).subscribe();
  expect(setTimeoutSpy.callCount).toBe(1);
});
