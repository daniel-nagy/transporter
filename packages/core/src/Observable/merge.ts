import { type ObservableLike, Observable } from "./Observable.js";

/**
 * Merges 2 or more observables into a single observable. The resulting
 * observable does not complete until all merged observables complete.
 *
 * Values will be emitted synchronously from each observable in the order
 * provided. Any asynchronous values will be emitted in the order they arrive.
 */
export function merge<T>(...observables: ObservableLike<T>[]): Observable<T> {
  return new Observable((observer) => {
    if (observables.length === 0) return observer.complete?.();

    let completedState = 0;

    const innerObserver = {
      ...observer,
      complete() {
        completedState += 1;
        if (completedState >= observables.length) observer.complete?.();
      }
    };

    const subscriptions = observables.map((observable) =>
      observable.subscribe(innerObserver)
    );

    return () => subscriptions.forEach(({ unsubscribe }) => unsubscribe());
  });
}
