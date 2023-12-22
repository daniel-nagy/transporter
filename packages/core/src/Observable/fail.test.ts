import { expect, test } from "bun:test";
import { spy } from "tinyspy";

import { fail } from "./fail.js";

test("an error is emitted immediately on subscribe", () => {
  const observable = fail(() => new Error("💣"));
  const error = spy();
  observable.subscribe({ error });
  expect(error.callCount).toBe(1);
  expect(error.calls).toEqual([[new Error("💣")]]);
});
