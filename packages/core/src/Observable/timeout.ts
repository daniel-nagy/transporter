import { schedule } from "../Time.js";
import {
  type ObservableLike,
  type Subscription,
  Observable
} from "./Observable.js";
import { fail } from "./fail.js";

export class TimeoutError extends Error {
  readonly name = "TimeoutError";
}

/**
 * Causes an observable to error if a value is not emitted within the specified
 * timeout limit. The timer resets every time a value is emitted.
 */
export function timeout<T>(
  milliseconds: number,
  callback: (error: TimeoutError) => ObservableLike<T> = fail
) {
  return (observable: ObservableLike<T>) =>
    new Observable<T>((observer) => {
      let innerSubscription: Subscription;

      const scheduleFrame = () =>
        schedule(milliseconds, () => {
          innerSubscription.unsubscribe();
          innerSubscription = callback(new TimeoutError()).subscribe(observer);
        }).cancel;

      let cancel = scheduleFrame();

      innerSubscription = observable.subscribe({
        complete() {
          cancel();
          observer.complete?.();
        },
        error(error: unknown) {
          cancel();
          observer.error?.(error);
        },
        next(value: T) {
          cancel();
          cancel = scheduleFrame();
          observer.next?.(value);
        }
      });

      return () => innerSubscription.unsubscribe();
    });
}
