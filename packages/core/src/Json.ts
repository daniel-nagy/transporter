import * as JsArray from "./JsArray.js";
import * as JsObject from "./JsObject.js";

export type { Json as t };

/**
 * Represents a JSON value.
 */
export type Json =
  | null
  | number
  | string
  | boolean
  | { [key: string]: Json }
  | Json[];

/**
 * Serializes a JSON value in a way that is deterministic, such that 2 strings
 * are equal if they encode the same value.
 *
 * @example
 *
 * Serialize({ a: "a", b: "b" }) === Serialize({ b: "b", a: "a" })
 */
export function serialize(value: Json): string {
  return JSON.stringify(sortDeep(value));
}

/**
 * Recursively sorts the properties of an object.
 */
export function sortDeep(value: Json): Json {
  if (Array.isArray(value)) return value.map(sortDeep);

  if (JsObject.isObject(value))
    JsArray.sortBy(Object.entries(value), ([key]) => key).reduce(
      (acc, [key, item]) => ({
        ...acc,
        [key]: sortDeep(item)
      }),
      {}
    );

  return value;
}
