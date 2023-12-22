import { type ObservableLike, Observable } from "./Observable.js";

export class BufferOverflowError extends Error {
  readonly name = "BufferOverflowError";
}

/**
 * A strategy for adding new values to a buffer that is full.
 */
export enum BufferOverflowStrategy {
  /**
   * Discard new values as they arrive.
   */
  DropLatest = "DropLatest",
  /**
   * Discard old values making room for new values.
   */
  DropOldest = "DropOldest",
  /**
   * Error if adding a new value to the buffer will cause an overflow.
   */
  Error = "Error"
}

export type Options = {
  /**
   * The max capacity of the buffer.
   */
  limit?: number;
  /**
   * How to handle a buffer overflow scenario.
   */
  overflowStrategy?: BufferOverflowStrategy;
};

/**
 * Buffers emitted values until a signal emits or completes. Once the signal
 * emits or completes the buffered values will be emitted synchronously.
 */
export function bufferUntil<T, S>(
  signal: ObservableLike<S>,
  {
    limit = Infinity,
    overflowStrategy = BufferOverflowStrategy.Error
  }: Options = {}
) {
  return (observable: ObservableLike<T>) =>
    new Observable<T>((observer) => {
      let queue: T[] | null = [];
      let buffer = true;
      let didComplete = false;

      const drain = () => {
        if (queue === null) return;
        queueMicrotask(() => signalSubscription.unsubscribe());
        queue.forEach((value) => observer.next?.(value));
        queue = null;
        buffer = false;
        if (didComplete) observer.complete?.();
      };

      const signalSubscription = signal.subscribe({
        error: (error) => observer.error?.(error),
        complete: drain,
        next: drain
      });

      const innerSubscription = observable.subscribe({
        ...observer,
        complete() {
          didComplete = true;
          if (!queue?.length) observer.complete?.();
        },
        next: (value) => {
          if (buffer && queue!.length >= limit) {
            switch (overflowStrategy) {
              case BufferOverflowStrategy.DropLatest:
                queue!.pop();
                break;
              case BufferOverflowStrategy.DropOldest:
                queue!.shift();
                break;
              case BufferOverflowStrategy.Error:
                observer.error?.(new BufferOverflowError());
            }
          }

          buffer ? queue!.push(value) : observer.next?.(value);
        }
      });

      return () => {
        signalSubscription.unsubscribe();
        innerSubscription.unsubscribe();
      };
    });
}
