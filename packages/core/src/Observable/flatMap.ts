import { from } from "./from.js";
import {
  type ObservableLike,
  type Subscription,
  Observable
} from "./Observable.js";

/**
 * Calls the callback function for each value emitted by the observable. The
 * callback function returns a new observable that is flattened to avoid
 * creating an observable of observables.
 *
 * The observable completes when the source observable and all inner observables
 * complete.
 */
export function flatMap<T, U>(
  callback: (value: T) => ObservableLike<U> | PromiseLike<U>
) {
  return (observable: ObservableLike<T>) =>
    new Observable<U>((observer) => {
      const subscriptions: Subscription[] = [];
      let count = 1;

      const complete = () => {
        count -= 1;
        if (count === 0) observer.complete?.();
      };

      subscriptions.push(
        observable.subscribe({
          complete,
          error: observer.error,
          next: (value) => {
            count += 1;

            subscriptions.push(
              from(callback(value)).subscribe({
                ...observer,
                complete
              })
            );
          }
        })
      );

      return () => subscriptions.forEach(({ unsubscribe }) => unsubscribe());
    });
}
