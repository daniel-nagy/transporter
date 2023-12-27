import {
  type ObservableLike,
  type Observer,
  Observable
} from "./Observable.js";
import { isPromise } from "../JsPromise.js";

/**
 * Creates a new `Observable` from an object that is observable like or
 * promise like.
 *
 * @example
 *
 * Observable.from(Promise.resolve("👍"));
 */
export function from<T>(
  observable: ObservableLike<T> | PromiseLike<T>
): Observable<T> {
  if (isPromise(observable)) {
    return new Observable((observer: Observer<T>) => {
      observable.then(
        (value) => {
          observer.next?.(value);
          observer.complete?.();
        },
        (error: unknown) => observer.error?.(error)
      );
    });
  }

  return Object.create(Observable.prototype, {
    subscribe: { value: observable.subscribe.bind(observable) }
  });
}
