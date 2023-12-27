/**
 * Removes the first `N` elements from an array.
 *
 * @example
 *
 * type OnlyC = DropFirst<["a", "b", "c"], 2>; // ["c"]
 */
export type DropFirst<
  T extends readonly unknown[],
  N extends number,
  Acc extends readonly unknown[] = []
> = Length<Acc> extends N
  ? T
  : T extends [infer E1, ...infer Rest]
    ? DropFirst<Rest, N, [...Acc, E1]>
    : T;

/**
 * Can be used to filter array index types from a union of array properties.
 *
 * @example
 *
 * type OnlyItems<T> = T extends ReadonlyArray<unknown>
 *   ? { [K in Array.Index<keyof T>]: T[K] }[Array.Index<keyof T>]
 *   : never;
 */
export type Index<T> = T extends `${number}` ? T : never;

/**
 * Extracts the `length` of an array. If the value is not an array then the
 * length is `0`.
 *
 * @example
 *
 * type ArrLength = Length<["a", "b", "c"]>; // 3
 */
export type Length<T> = T extends readonly unknown[] ? T["length"] : 0;

/**
 * Tests if a value is an array. This version provides better type inference
 * than `Array.isArray`.
 *
 * @example
 *
 * isArray([]); // true
 * isArray(12); // false
 */
export function isArray<T, U>(value: T | U[]): value is U[] {
  return Array.isArray(value);
}

/**
 * Sorts an array by some processor function. The processor function is called
 * for each element in the array and the return value is used to compared the
 * items using strict equality comparison.
 *
 * @example
 *
 * sortBy(["1", "5", "2", "3"], Number.parseInt); // ["1", "2", "3", "5"]
 */
export function sortBy<T, U>(list: T[], callback: (item: T) => U): T[] {
  return [...list].sort((item, against): -1 | 0 | 1 => {
    const _0 = callback(item);
    const _1 = callback(against);

    switch (true) {
      case _0 === _1:
        return 0;
      case _0 < _1:
        return -1;
      default:
        return 1;
    }
  });
}
