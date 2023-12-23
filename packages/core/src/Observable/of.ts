import { Observable } from "./Observable.js";

/**
 * Creates a new `Observable` that emits each argument synchronously and then
 * completes.
 *
 * @example
 *
 * const observable = Observable.of(1, 2, 3);
 *
 * // Logs the values 1, 2, and 3 synchronously and then completes.
 * observable.subscribe(console.log);
 */
export function of<T>(...values: [T, ...T[]]) {
  return new Observable<T>((observer) => {
    values.forEach((value) => observer.next?.(value));
    observer.complete?.();
  });
}
