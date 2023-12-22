import * as JsArray from "./JsArray.js";
import * as JsFunction from "./JsFunction.js";
import * as JsObject from "./JsObject.js";

export { Injector as t };

const inject = Symbol.for("Injector.inject");

/**
 * Represents a function that has been marked for dependency injection.
 */
export type InjectableFunction<Func = unknown, Tags = unknown> = Func & {
  [inject]: Tags;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export type Tag<Value> = {
  _tag: "Injector.Tag";
};

/**
 * Represents an injectable dependency. The tag can be used to add or retrieve
 * a dependency from the container.
 *
 * @example
 *
 * type Session = { clientId: string; }
 * const Session = Injector.Tag<Session>();
 */
export const Tag = <Value>(): Tag<Value> => ({
  _tag: "Injector.Tag"
});

/**
 * Given a list of tags, produce a list of values held by those tags.
 */
export type Values<Tags, Acc extends unknown[] = []> = Tags extends readonly [
  Tag<infer Value>,
  ...infer Tail
]
  ? Values<Tail, [...Acc, Value]>
  : Acc;

/**
 * An object encapsulating a dependency container. Values may be added or read
 * from the container using tags.
 */
class Injector {
  #state = new Map<Tag<unknown>, unknown>();

  /**
   * Adds a value to the container using a tag.
   *
   * @example
   *
   * type Session = { clientId: string; }
   * const Session = Injector.Tag<Session>();
   * const injector = Injector.empty();
   * injector.add(Session, { clientId: "Client:1" })
   */
  add<Value>(tag: Tag<Value>, value: Value): Injector {
    this.#state.set(tag, value);
    return this;
  }

  /**
   * Gets a value from the container using a tag.
   *
   * @example
   *
   * injector.get(Session); // { clientId: "Client:1" }
   */
  get(tag: Tag<unknown>) {
    return this.#state.get(tag);
  }
}

/**
 * Creates a new empty `Injector`.
 */
export const empty = (): Injector => new Injector();

/**
 * Returns a list of tags from a marked function. If the function is not marked
 * the list will be empty.
 */
export function getTags(func: JsFunction.t): Tag<unknown>[] {
  return JsObject.has(func, inject) ? (func[inject] as Tag<unknown>[]) : [];
}

/**
 * Returns a new function that is marked for dependency injection. The call
 * signature of the new function will omit any injected dependencies.
 *
 * @example
 *
 * type Session = { clientId: string; }
 * const Session = Injector.Tag<Session>();
 * const wrappedFunc = Injector.provide([Session], (session: Session) => {})
 */
export function provide<
  const Tags extends readonly Tag<unknown>[],
  const Args extends [...Values<Tags>, ...unknown[]],
  const Return
>(
  tags: Tags,
  func: (...args: Args) => Return
): (...args: JsArray.DropFirst<Args, JsArray.Length<Tags>>) => Return {
  return new Proxy(func, {
    get(target, prop, receiver) {
      if (prop === inject) return tags;
      return Reflect.get(target, prop, receiver);
    },
    getOwnPropertyDescriptor(target, prop) {
      if (prop === inject) return { configurable: true };
      return Reflect.getOwnPropertyDescriptor(target, prop);
    },
    has(target, prop) {
      if (prop === inject) return true;
      return Reflect.has(target, prop);
    }
  }) as (...args: JsArray.DropFirst<Args, JsArray.Length<Tags>>) => Return;
}
