import { type ObservableLike, Observable } from "./Observable.js";

/**
 * Takes values from an observable until a signal emits or completes.
 */
export function takeUntil(signal: ObservableLike<unknown>) {
  return <T>(observable: ObservableLike<T>) =>
    new Observable<T>((observer) => {
      const innerSubscription = observable.subscribe(observer);

      const done = () => {
        observer.complete?.();
        innerSubscription.unsubscribe();
        queueMicrotask(() => signalSubscription.unsubscribe());
      };

      const signalSubscription = signal.subscribe({
        error(error) {
          observer.error?.(error);
        },
        complete: done,
        next: done
      });

      return () => {
        innerSubscription.unsubscribe();
        signalSubscription.unsubscribe();
      };
    });
}
