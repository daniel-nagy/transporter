import { expect, test } from "bun:test";
import { spy } from "tinyspy";

import * as Fiber from "./Fiber.js";

test("a fiber is active when created", () => {
  expect(Fiber.init().state).toBe(Fiber.State.Active);
});

test("terminating a fiber changes its state", () => {
  const fiber = Fiber.init();
  const next = spy();
  const complete = spy();
  fiber.stateChange.subscribe({ complete, next });
  fiber.terminate();
  expect(fiber.state).toBe(Fiber.State.Terminated);
  expect(next.callCount).toBe(2);
  expect(next.calls).toEqual([[Fiber.State.Active], [Fiber.State.Terminated]]);
  expect(complete.callCount).toBe(1);
});
