import { BehaviorSubject, filter } from "./Observable/index.js";
import * as Fiber from "./Fiber.js";

export { Supervisor as t };

/**
 * Thrown when a terminated supervisor is given a new task to observe.
 */
export class TerminatedError extends Error {
  readonly name = "TerminatedError";
}

/**
 * Thrown when a supervisor is given a new task to observe and it is already
 * observing a task with the same id.
 */
export class UniqueTaskIdError extends Error {
  readonly name = "UniqueTaskIdError";
}

/**
 * A `Supervisor` is a fiber that observes a set of fibers, called tasks. When
 * a supervisor is terminated, all of its tasks will be terminated as well.
 */
export class Supervisor<Task extends Fiber.t = Fiber.t> extends Fiber.t {
  #taskCount = new BehaviorSubject(0);

  readonly taskCount = this.#taskCount.asObservable();
  readonly tasks = new Map<string, Task>();

  /**
   * Starts observing a new task. If an observed task terminates it will no
   * longer be observed.
   *
   * @throws {TerminatedError} If the supervisor is terminated.
   *
   * @throws {UniqueTaskIdError} If the supervisor is already observing a task with the same id.
   */
  observe(task: Task) {
    if (this.state === Fiber.State.Terminated)
      throw new TerminatedError(
        "Refusing to add task to terminated supervisor."
      );

    if (this.tasks.has(task.id))
      throw new UniqueTaskIdError(
        `A task with id "${task.id}" already exists.`
      );

    this.tasks.set(task.id, task);
    this.#taskCount.next(this.tasks.size);

    task.stateChange
      .pipe(filter((state) => state === Fiber.State.Terminated))
      .subscribe(() => {
        if (this.tasks.delete(task.id)) this.#taskCount.next(this.tasks.size);
      });
  }

  /**
   * Terminates all tasks and then terminates the supervisor.
   */
  terminate() {
    this.taskCount
      .pipe(filter((count) => count === 0))
      .subscribe(() => queueMicrotask(() => this.#taskCount.complete()));

    this.tasks.forEach((task) => task.terminate());

    super.terminate();
  }
}

/**
 * Creates a new `Supervisor`.
 */
export const init = <Task extends Fiber.t = Fiber.t>(id?: string) =>
  new Supervisor<Task>(id);
