import type { ObservableLike } from "./Observable.js";

export class EmptyError extends Error {
  readonly name = "EmptyError";
}

/**
 * Transforms an observable into a promise that resolves with the first emitted
 * value from the observable. If the observable errors the promise is rejected.
 * If the observable completes without ever emitting a value the promise is
 * rejected with an `EmptyError`.
 *
 * Be careful transforming an observable into a promise. If the observable never
 * emits the promise will never resolve.
 */
export function firstValueFrom<T>(observable: ObservableLike<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const { unsubscribe } = observable.subscribe({
      complete: () => reject(new EmptyError()),
      error: (error) => reject(error),
      next: (value) => {
        queueMicrotask(() => unsubscribe());
        resolve(value);
      }
    });
  });
}
