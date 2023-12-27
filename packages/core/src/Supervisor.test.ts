import { expect, test } from "bun:test";
import { spy } from "tinyspy";

import * as Fiber from "./Fiber.js";
import * as Supervisor from "./Supervisor.js";

test("observing a task", () => {
  const task = Fiber.init("0");
  const supervisor = Supervisor.init();
  supervisor.observe(task);
  expect(supervisor.tasks.get(task.id)).toBe(task);
});

test("when a task is terminated it is unobserved", () => {
  const task = Fiber.init("0");
  const supervisor = Supervisor.init();
  supervisor.observe(task);
  task.terminate();
  expect(supervisor.tasks.get(task.id)).toBeUndefined();
});

test("when a supervisor is terminated all its tasks are terminated", () => {
  const rootSupervisor = Supervisor.init();
  const supervisor = Supervisor.init();
  const task1 = Fiber.init();
  const task2 = Fiber.init();

  rootSupervisor.observe(supervisor);
  rootSupervisor.observe(task2);
  supervisor.observe(task1);
  rootSupervisor.terminate();

  expect(rootSupervisor.state).toBe(Fiber.State.Terminated);
  expect(supervisor.state).toBe(Fiber.State.Terminated);
  expect(task1.state).toBe(Fiber.State.Terminated);
  expect(task2.state).toBe(Fiber.State.Terminated);
});

test("an error is thrown if a task is added to a terminated supervisor", () => {
  const supervisor = Supervisor.init();
  supervisor.terminate();
  expect(() => supervisor.observe(Fiber.init())).toThrow(
    Supervisor.TerminatedError as ErrorConstructor
  );
});

test("an error is thrown if multiple tasks have the same id", () => {
  const task1 = Fiber.init("0");
  const task2 = Fiber.init("0");
  const supervisor = Supervisor.init();
  supervisor.observe(task1);
  expect(() => supervisor.observe(task2)).toThrow(
    Supervisor.UniqueTaskIdError as ErrorConstructor
  );
});

test("a supervisors task count changes when tasks are added or removed", () => {
  const supervisor = Supervisor.init();
  const task1 = Fiber.init();
  const task2 = Fiber.init();
  const next = spy();
  supervisor.taskCount.subscribe(next);
  supervisor.observe(task1);
  supervisor.observe(task2);
  task1.terminate();

  expect(next.callCount).toBe(4);
  expect(next.calls).toEqual([[0], [1], [2], [1]]);
});

test("taskCount completes when a supervisor is terminated", () => {
  const supervisor = Supervisor.init();
  const task1 = Fiber.init();
  const task2 = Fiber.init();
  supervisor.observe(task1);
  supervisor.observe(task2);
  const next = spy();
  const complete = spy();
  supervisor.taskCount.subscribe({ complete, next });
  supervisor.terminate();

  expect(next.callCount).toBe(3);
  expect(next.calls).toEqual([[2], [1], [0]]);
  queueMicrotask(() => expect(complete.callCount).toBe(1));
});
