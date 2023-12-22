import * as JsArray from "./JsArray.js";
import * as JsFunction from "./JsFunction.js";

/**
 * An alias for an empty object.
 */
export type Empty = Record<string, never>;

/**
 * Produces a list of keyvalue tuples for an object.
 *
 * @example
 *
 * type Pairs = Entries<{ a: "a", b: "b" }>; // (["a", "a"] | ["b", "b"])[]
 */
export type Entries<T extends object> = T extends readonly unknown[]
  ? Exclude<{ [K in keyof T]: [K, T[K]] }[number], undefined>[]
  : Exclude<{ [K in keyof T]: [K, T[K]] }[keyof T], undefined>[];

/**
 * Given an object and a type, recursively pick properties of that type. If no
 * properties of that type exist an empty object is produced.
 *
 * @example
 *
 * type OnlyFunctions = PickDeep<
 *   { a: 12; b: { c: () => void }; d: [true, () => number] },
 *   Function.t
 * >;
 * // {
 * //   b: {
 * //       c: () => void;
 * //   };
 * //   d: {
 * //       1: () => number;
 * //   };
 * // }
 */
export type PickDeep<T, U> = T extends U
  ? T
  : T extends ReadonlyArray<unknown>
    ? {
        [K in JsArray.Index<keyof T> as Empty extends PickDeep<T[K], U>
          ? never
          : K]: PickDeep<T[K], U>;
      }
    : T extends object
      ? {
          [K in keyof T as Empty extends PickDeep<T[K], U>
            ? never
            : K]: PickDeep<T[K], U>;
        }
      : Empty;

/**
 *  Recursively make the properties of an object readonly.
 */
export type ReadonlyDeep<T> = T extends JsFunction.t
  ? T
  : T extends object
    ? { readonly [K in keyof T]: ReadonlyDeep<T[K]> }
    : T;

/**
 * Produces a union of the nested values of an object. Functions are treated as
 * values instead of objects.
 *
 * @example
 *
 * class Foo {
 *   readonly num = 12;
 *
 *   bar() {
 *     return "👍";
 *   }
 * }
 *
 * type Values = NestedValues<{ a: { b: "b" }, c: Foo }> // 12 | "b" | (() => string)
 */
export type NestedValues<T> = T extends JsFunction.t
  ? T
  : T extends ReadonlyArray<unknown>
    ? { [K in JsArray.Index<keyof T>]: NestedValues<T[K]> }[JsArray.Index<
        keyof T
      >]
    : T extends object
      ? { [K in keyof T]: NestedValues<T[K]> }[keyof T]
      : T;

/**
 * Produces a union of values for an object.
 *
 * @example
 *
 * type Union = Values<{ a: "a", b: "b" }>; // "a" | "b"
 */
export type Values<T> = T[keyof T];

/**
 * Returns the entries of an object with better type inference than
 * `Object.entries`.
 *
 * @example
 *
 * entries({ a: "a", b: "b" }); // (["a", "a"] | ["b", "b"])[]
 */
export function entries<T extends object>(record: T): Entries<T> {
  return Object.entries(record) as Entries<T>;
}

/**
 * Gets a value from an object given a path to a property. Returns the original
 * value if the path is empty. Returns `undefined` if the object does not
 * contain the path.
 *
 * @example
 *
 * getIn({ a: { b: "b" } }, ["a", "b"]); // "b"
 */
export function getIn<T>(value: T, [prop, ...path]: string[]): unknown {
  if (!prop) return value;
  if (isObject(value) && has(value, prop)) return getIn(value[prop], path);
  return undefined;
}

/**
 * Checks if an object contains a property and narrows its type to include that
 * property.
 */
export function has<Prop extends PropertyKey>(
  value: object,
  property: Prop
): value is Record<Prop, unknown> {
  return property in value;
}

/**
 * Returns true if the value is of type `object`. Note that functions are of
 * type object.
 *
 * @example
 *
 * isObject({}); // true
 * isObject([]); // true
 * isObject(() => {}); // true
 * isObject(new Date()); // true
 * isObject(""); // false
 * isObject(null); // false
 */
export function isObject(value: unknown): value is object {
  return (
    typeof value === "function" || (typeof value === "object" && value !== null)
  );
}

/**
 * Returns the keys of an object with better type inference than `Object.keys`.
 */
export function keys<T extends object>(value: T): [keyof T] {
  return Object.keys(value) as [keyof T];
}

/**
 * Returns a new object by recursively calling the callback function for each
 * value in the object.
 */
export function mapValues<T extends object | unknown[], R>(
  value: T,
  callback: (...keyValue: Entries<T>[number]) => R
): { [Key in keyof T]: R } | R[] {
  if (Array.isArray(value))
    return value.map((item, index) => callback(index, item));

  return entries(value).reduce(
    (acc, [key, item]) => ({
      ...acc,
      [key]: callback(key, item)
    }),
    {} as { [Key in keyof T]: R }
  );
}
