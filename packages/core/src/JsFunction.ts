export type { JsFunction as t };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type JsFunction = (...args: any) => any;

/**
 * Creates a function who's arguments are both covariant and contravariant.
 *
 * @example
 * type MyFunction = Bivariant<(arg: string | number) => void>;
 */
export type Bivariant<T extends JsFunction> = {
  λ(...args: Parameters<T>): ReturnType<T>;
}["λ"];

/**
 * Produces the output type of a function.
 */
export type Output<T> = T extends (...args: infer _Args) => infer R ? R : never;

/**
 * Produces a union of input types of a function.
 */
export type Input<T> = T extends (...args: infer Args) => infer _R
  ? Args[number]
  : never;

/**
 * Takes a function that may or may not be async and wraps it in an async
 * function.
 */
export function async<const A extends unknown[], const R>(
  procedure: (...a: A) => R
): (...a: A) => Promise<Awaited<R>> {
  return async (...args: A): Promise<Awaited<R>> => await procedure(...args);
}

/**
 * Returns `true` if the value is a function, allowing its type to be narrowed.
 *
 * @example
 * isFunction(() => {}); // true
 * isFunction([]); // false
 */
export function isFunction(value: unknown): value is JsFunction {
  return typeof value === "function";
}
