import { schedule } from "../Time.js";
import { Observable } from "./Observable.js";

/**
 * Creates an observable that calls a function at a regular interval and emits
 * the value returned by that function.
 */
export function cron<T>(interval: number, callback: () => T | Promise<T>) {
  return new Observable<T>((observer) => {
    let timer: { cancel(): void };

    const beat = () =>
      schedule(interval, async () => {
        try {
          observer.next?.(await callback());
        } catch (error) {
          observer.error?.(error);
        }

        timer = beat();
      });

    timer = beat();

    return () => timer.cancel();
  });
}
