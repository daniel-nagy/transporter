import * as BehaviorSubject from "./BehaviorSubject.js";
import * as UUID from "./UUID.js";

export { Fiber as t };

/**
 * Keeps track of all active fibers.
 */
const table = new Map<string, Fiber>();

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
    public readonly id: string = UUID.v4()
  ) {
    table.set(id, this);
  }

  /**
   * Terminates the fiber. The fiber's state will transition to `Terminated` and
   * then complete.
   */
  terminate() {
    this.#state.next(State.Terminated);
    this.#state.complete();
    table.delete(this.id);
  }

  [Symbol.dispose]() {
    this.terminate();
  }
}

/**
 * Get a reference to a Fiber from its id.
 */
export const get = <T extends Fiber>(id: string): T | null => {
  return (table.get(id) as T) ?? null;
};

/**
 * Creates a new `Fiber`.
 */
export const init = (id?: string) => new Fiber(id);
