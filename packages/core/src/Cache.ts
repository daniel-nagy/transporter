import * as JsFunction from "./JsFunction.js";
import * as Json from "./Json.js";

export { Cache as t };

export type NotFound = {
  readonly _tag: "Cache.NotFound";
};

/**
 * A placeholder type for a cache miss. Note that a distinct value is necessary
 * to disambiguate between a cache miss and a falsy value, such as `null` or
 * `undefined`, which are valid function return values.
 */
export const NotFound: NotFound = {
  _tag: "Cache.NotFound"
};

/**
 * A type alias for the 2nd key used to index the cache. A function's arguments
 * are serialized using a stable algorithm.
 */
export type Arguments = string;

/**
 * A `Cache` can be used to memoize a function if its arguments are serializable.
 *
 * The cache uses a compound key. The first key is a reference to the function
 * and the second key is the arguments that where used to call the function. The
 * arguments are serialized to a string using a stable algorithm.
 *
 * The cache can be used to memoize remote function calls because Transporter
 * guarantees that proxies are referentially stable.
 *
 * @example
 *
 * const getUser = (id: string) => User;
 * const cache = Cache.init();
 * const memoGetUser = cache.memo(getUser);
 * memoGetUser("5779bba1-4462-4dec-bf44-1df537344b3f")
 */
export class Cache {
  #state = new WeakMap<JsFunction.t, Map<Arguments, unknown>>();

  /**
   * Add the return value of a function call to the cache.
   */
  add(func: JsFunction.t, args: Json.t[], value: unknown) {
    const cache = this.#state.get(func) ?? new Map();
    this.#state.set(func, cache.set(Json.serialize(args), value));
  }

  /**
   * Get the return value of a function call from the cache. Returns `NotFound`
   * if the value does not exist in the cache.
   */
  get<Args extends Json.t[], Return>(
    func: (...args: Args) => Return,
    args: Args
  ): Return | NotFound {
    if (!this.#state.has(func)) return NotFound;

    const funcCache = this.#state.get(func)!;
    const argsKey = Json.serialize(args);

    return funcCache.has(argsKey)
      ? (funcCache.get(argsKey) as Return)
      : NotFound;
  }

  /**
   * Checks to see if a value exists in the cache for a given function and
   * arguments.
   */
  has(func: JsFunction.t, args?: Json.t[]): boolean {
    if (!args) return this.#state.has(func);
    return this.#state.get(func)?.has(Json.serialize(args)) ?? false;
  }

  /**
   * Wraps a function so that calling the wrapped function will automatically
   * read and write from the cache.
   */
  memo<Args extends Json.t[], Return>(
    func: (...args: Args) => Return
  ): (...args: Args) => Return {
    return (...args: Args) => {
      if (!this.has(func, args)) this.add(func, args, func(...args));
      return this.get(func, args) as Return;
    };
  }

  /**
   * Remove a value from the cache. Returns `true` if the value was found and
   * removed.
   */
  remove(func: JsFunction.t, args?: Json.t[]): boolean {
    if (!args) return this.#state.delete(func);
    return this.#state.get(func)?.delete(Json.serialize(args)) ?? false;
  }

  /**
   * Allows updating a value in the cache so that future calls return the new
   * value.
   */
  update<Args extends Json.t[], Return>(
    func: (...args: Args) => Return,
    args: Args,
    callback: (value: Return) => Return
  ): void {
    if (this.has(func, args))
      this.add(func, args, callback(this.get(func, args) as Return));
  }
}

/**
 * Creates a new empty `Cache` object.
 */
export const init = () => new Cache();
