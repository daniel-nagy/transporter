import { type ObservableLike, Observable } from "./Observable.js";

/**
 * Allows performing effects when a value is emitted without altering the value
 * that is emitted.
 */
export function tap<T>(callback: (value: T) => unknown) {
  return (observable: ObservableLike<T>) =>
    new Observable<T>((observer) => {
      const innerSubscription = observable.subscribe({
        ...observer,
        next: (value) => {
          callback(value);
          observer.next?.(value);
        }
      });

      return () => innerSubscription.unsubscribe();
    });
}
