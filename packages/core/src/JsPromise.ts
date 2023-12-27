import * as JsFunction from "./JsFunction.js";
import * as JsObject from "./JsObject.js";

/**
 * Returns `true` if the value is "Promise like". In JavaScript any object with
 * a `then` method is treated like a Promise when being resolved or awaited.
 *
 * @example
 *
 * const promiseLike = {
 *   then() {
 *     console.log("really?");
 *   }
 * }
 *
 * isPromise(promiseLike); // true
 *
 * await promiseLike;
 * "really?"
 */
export function isPromise(value: unknown): value is PromiseLike<unknown> {
  return (
    JsObject.isObject(value) &&
    JsObject.has(value, "then") &&
    JsFunction.isFunction(value.then)
  );
}
