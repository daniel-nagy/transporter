import * as BehaviorSubject from "./BehaviorSubject.js";

export { Fiber as t };

/**
 * A fiber's state.
 */
export enum State {
  Active = "Active",
  Terminated = "Terminated"
}

/**
 * A `Fiber` represents a lightweight background task. Unlike a thread, the
 * lifecycle of a fiber is managed entirely by the user program.
 *
 * A fiber starts in an `Active` state and may be terminated at some unknown
 * point in the future.
 */
export class Fiber {
  #state = BehaviorSubject.of(State.Active);

  get state() {
    return this.#state.getValue();
  }

  stateChange = this.#state.asObservable();

  constructor(
    /**
     * A unique identifier for this fiber.
     */
    public readonly id: string = crypto.randomUUID()
  ) {}

  /**
   * Terminates the fiber. The fiber's state will transition to `Terminated` and
   * then complete.
   */
  terminate() {
    this.#state.next(State.Terminated);
    this.#state.complete();
  }

  [Symbol.dispose]() {
    this.terminate();
  }
}

/**
 * Creates a new `Fiber`.
 */
export const init = (id?: string) => new Fiber(id);
