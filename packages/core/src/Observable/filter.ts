import { type ObservableLike, Observable } from "./Observable.js";

/**
 * Selectively keeps values for which the callback returns `true`. All other
 * values are discarded.
 */
export function filter<T, S extends T>(
  callback: ((value: T) => value is S) | ((value: T) => boolean)
) {
  return (observable: ObservableLike<T>) =>
    new Observable<S>((observer) => {
      const innerSubscription = observable.subscribe({
        ...observer,
        next: (value) => callback(value) && observer.next?.(value as S)
      });

      return () => innerSubscription.unsubscribe();
    });
}
