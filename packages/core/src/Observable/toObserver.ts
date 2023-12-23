import type { Observer } from "./Observable.js";

/**
 * Takes a value that may be an observer or a next function and returns an
 * observer.
 */
export function toObserver<T>(
  observerOrNext: Observer<T> | ((value: T) => void) = () => {}
): Observer<T> {
  return typeof observerOrNext === "function"
    ? { next: observerOrNext }
    : observerOrNext;
}
