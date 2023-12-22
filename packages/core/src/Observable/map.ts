import { type ObservableLike, Observable } from "./Observable.js";

/**
 * Calls the callback function for each value emitted by the observable and
 * emits the value returned by the callback function.
 */
export function map<T, U>(callback: (value: T) => U) {
  return (observable: ObservableLike<T>): Observable<U> =>
    new Observable((observer) => {
      const innerSubscription = observable.subscribe({
        ...observer,
        next: (value) => observer.next?.(callback(value))
      });

      return () => innerSubscription.unsubscribe();
    });
}
