import {
  type ObservableLike,
  type Subscription,
  Observable
} from "./Observable.js";

/**
 * Catches an error emitted by an upstream observable. The callback function can
 * return a new observable to recover from the error.
 */
export function catchError<T>(callback: <E>(error: E) => ObservableLike<T>) {
  return (observable: ObservableLike<T>) =>
    new Observable<T>((observer) => {
      let innerSubscription: Subscription;

      innerSubscription = observable.subscribe({
        ...observer,
        error: <E>(error: E) => {
          innerSubscription.unsubscribe();
          innerSubscription = callback(error).subscribe(observer);
        }
      });

      return () => innerSubscription.unsubscribe();
    });
}
