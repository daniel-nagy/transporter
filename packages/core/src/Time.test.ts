import {
  type InstalledClock,
  install as useFakeTimers
} from "@sinonjs/fake-timers";
import { afterEach, beforeEach, expect, test } from "bun:test";
import { spy } from "tinyspy";

import { IntervalError, timer } from "./Time.js";

let clock: InstalledClock;

beforeEach(() => {
  clock = useFakeTimers();
});

afterEach(() => {
  clock.uninstall();
});

test("the callback is called at the specified interval", () => {
  const callback = spy();
  const controller = timer({ callback, interval: 1000 });

  clock.tick(3000);
  controller.stop();
  expect(callback.callCount).toBe(3);
});

test("the callback is not called if the timer is cancelled", () => {
  const callback = spy();
  const controller = timer({ callback, interval: 1000 });

  clock.tick(3000);
  controller.stop();
  clock.tick(3000);
  expect(callback.callCount).toBe(3);
});

test("an IntervalError is thrown if the interval is less than or equal to 0", () => {
  const callback = spy();

  expect(() => timer({ callback, interval: 0 })).toThrow(
    IntervalError as ErrorConstructor
  );

  expect(() => timer({ callback, interval: -1000 })).toThrow(
    IntervalError as ErrorConstructor
  );

  expect(callback.callCount).toBe(0);
});
