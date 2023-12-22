import { type ObservableLike, Observable } from "./Observable.js";

/**
 * Takes the first `n` values from an observable and then completes.
 */
export function take(amount: number) {
  return <T>(observable: ObservableLike<T>) =>
    new Observable<T>((observer) => {
      if (amount <= 0) return observer.complete?.();

      let remaining = amount;

      const innerSubscription = observable.subscribe({
        ...observer,
        next: (value) => {
          observer.next?.(value);
          remaining = remaining - 1;
          if (remaining === 0) {
            queueMicrotask(() => innerSubscription.unsubscribe());
            observer.complete?.();
          }
        }
      });

      return () => innerSubscription.unsubscribe();
    });
}
