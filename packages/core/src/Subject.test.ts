import { install as useFakeTimers } from "@sinonjs/fake-timers";
import { expect, test } from "bun:test";
import { spy } from "tinyspy";

import * as Subject from "./Subject.js";

test("subscribing to a subject", () => {
  const subject = Subject.init();
  const next = spy();

  subject.subscribe({ next });
  subject.next(8);
  expect(next.callCount).toBe(1);
  expect(next.calls).toEqual([[8]]);
});

test("emitting multiple values", () => {
  const subject = Subject.init();
  const next = spy();

  subject.subscribe({ next });
  subject.next(1);
  subject.next(2);
  subject.next(3);

  expect(next.callCount).toBe(3);
  expect(next.calls).toEqual([[1], [2], [3]]);
});

test("a subject does not replay its values", () => {
  const subject = Subject.init();
  const next1 = spy();
  const next2 = spy();
  const next3 = spy();

  subject.subscribe(next1);
  subject.next(1);
  subject.subscribe(next2);
  subject.next(2);
  subject.subscribe(next3);
  subject.next(3);

  expect(next1.callCount).toBe(3);
  expect(next2.callCount).toBe(2);
  expect(next3.callCount).toBe(1);
  expect(next1.calls).toEqual([[1], [2], [3]]);
  expect(next2.calls).toEqual([[2], [3]]);
  expect(next3.calls).toEqual([[3]]);
});

test("a subject that emits an error", () => {
  const subject = Subject.init();
  const error = spy();

  subject.subscribe({ error });
  subject.error("💣");

  expect(error.callCount).toBe(1);
  expect(error.calls).toEqual([["💣"]]);
});

test("the error is thrown if at least one observer has no error handler", async () => {
  const subject = Subject.init();
  subject.subscribe({ error() {} });
  subject.subscribe({});
  expect(() => subject.error("💣")).toThrow("💣");
});

test("an subject that completes", () => {
  const observable = Subject.init();
  const complete = spy();

  observable.subscribe({ complete });
  observable.complete();

  expect(complete.callCount).toBe(1);
  expect(complete.calls).toEqual([[]]);
});

test("the error callback is only called once", () => {
  const observable = Subject.init();
  const error = spy();

  observable.subscribe({ error });
  observable.error("💣");
  observable.error("💣");

  expect(error.callCount).toBe(1);
  expect(error.calls).toEqual([["💣"]]);
});

test("the complete callback is only called once", () => {
  const observable = Subject.init();
  const complete = spy();

  observable.subscribe({ complete });
  observable.complete();
  observable.complete();

  expect(complete.callCount).toBe(1);
  expect(complete.calls).toEqual([[]]);
});

test("new values are not emitted after a subject errors", () => {
  const observable = Subject.init<number>();
  const next = spy();

  observable.subscribe({ next, error() {} });
  observable.next(1);
  observable.next(2);
  observable.error("💣");
  observable.next(3);

  expect(next.callCount).toBe(2);
  expect(next.calls).toEqual([[1], [2]]);
  expect(next.calls).not.toEqual([[1], [2], [3]]);
});

test("new values are not emitted after an subject completes", () => {
  const observable = Subject.init<number>();

  const observer = spy();
  observable.subscribe(observer);
  observable.next(1);
  observable.next(2);
  observable.complete();
  observable.next(3);

  expect(observer.callCount).toBe(2);
  expect(observer.calls).toEqual([[1], [2]]);
  expect(observer.calls).not.toEqual([[1], [2], [3]]);
});

test("the complete callback is not called if an error occurred", () => {
  const observable = Subject.init();
  const complete = spy();

  observable.subscribe({ complete, error() {} });
  observable.error("💣");
  observable.complete();

  expect(complete.called).toBe(false);
});

test("the error callback is not called if an subject completed", () => {
  const observable = Subject.init();
  const error = spy();

  observable.subscribe({ error });
  observable.complete();
  observable.error("💣");

  expect(error.called).toBe(false);
});

test("unsubscribing from a subject", () => {
  const clock = useFakeTimers();

  const observable = Subject.init<number>();
  const next = spy();
  const { unsubscribe } = observable.subscribe({ next });

  observable.next(1);
  setTimeout(() => observable.next(2));
  unsubscribe();
  clock.runAll();
  clock.uninstall();
  expect(next.callCount).toBe(1);
});

test("The complete callback is called if subscribing to a completed subject", () => {
  const observable = Subject.init();
  const complete = spy();
  observable.complete();
  observable.subscribe({ complete });
  expect(complete.callCount).toBe(1);
  expect(complete.calls).toEqual([[]]);
});

test("The error callback is called if subscribing to a subject that errored", () => {
  const observable = Subject.init();
  const error = spy();
  observable.error("💣");
  observable.subscribe({ error });
  expect(error.callCount).toBe(1);
  expect(error.calls).toEqual([["💣"]]);
});

test("The error is thrown if subscribing to a subject that errored without an error handler", () => {
  const observable = Subject.init();
  observable.error("💣");
  expect(() => observable.subscribe({})).toThrow("💣");
});
