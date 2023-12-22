import { install as useFakeTimers } from "@sinonjs/fake-timers";
import { expect, test } from "bun:test";
import { spy } from "tinyspy";

import { Observable } from './Observable.js';

test("subscribing to an observable", () => {
  const observable = Observable.of(5);
  const observer = spy();
  observable.subscribe(observer);

  expect(observer.callCount).toBe(1);
  expect(observer.calls).toEqual([[5]]);
});

test("subscribing to the same observable more than once", () => {
  const observable = Observable.of(5);
  const observer0 = spy();
  const observer1 = spy();
  observable.subscribe(observer0);
  observable.subscribe(observer1);

  expect(observer0.callCount).toBe(1);
  expect(observer1.callCount).toBe(1);
  expect(observer0.calls).toEqual([[5]]);
  expect(observer1.calls).toEqual([[5]]);
});

test("emitting multiple values", () => {
  const observable = Observable.of(1, 2, 3);
  const observer = spy();
  observable.subscribe(observer);

  expect(observer.callCount).toBe(3);
  expect(observer.calls).toEqual([[1], [2], [3]]);
});

test("an observable that emits an error", () => {
  const observable = new Observable((observer) => {
    observer.error?.("💣");
  });

  const error = spy();
  observable.subscribe({ error });

  expect(error.callCount).toBe(1);
  expect(error.calls).toEqual([["💣"]]);
});

test("the error is thrown if there is no error handler", async () => {
  const observable = new Observable((observer) => {
    observer.error?.("💣");
  });

  expect(() => observable.subscribe({})).toThrow("💣");
});

test("an observable that completes", () => {
  const observable = new Observable((observer) => {
    observer.complete?.();
  });

  const complete = spy();
  observable.subscribe({ complete });

  expect(complete.callCount).toBe(1);
  expect(complete.calls).toEqual([[]]);
});

test("the error callback is only called once", () => {
  const observable = new Observable((observer) => {
    observer.error?.("💣");
    observer.error?.("💣");
  });

  const error = spy();
  observable.subscribe({ error });

  expect(error.callCount).toBe(1);
  expect(error.calls).toEqual([["💣"]]);
});

test("the complete callback is only called once", () => {
  const observable = new Observable((observer) => {
    observer.complete?.();
    observer.complete?.();
  });

  const complete = spy();
  observable.subscribe({ complete });

  expect(complete.callCount).toBe(1);
  expect(complete.calls).toEqual([[]]);
});

test("new values are not emitted after an observable errors", () => {
  const observable = new Observable<number>((observer) => {
    observer.next?.(1);
    observer.next?.(2);
    observer.error?.("💣");
    observer.next?.(3);
  });

  const next = spy();
  observable.subscribe({ next, error() {} });

  expect(next.callCount).toBe(2);
  expect(next.calls).toEqual([[1], [2]]);
  expect(next.calls).not.toEqual([[1], [2], [3]]);
});

test("new values are not emitted after an observable completes", () => {
  const observable = new Observable<number>((observer) => {
    observer.next?.(1);
    observer.next?.(2);
    observer.complete?.();
    observer.next?.(3);
  });

  const observer = spy();
  observable.subscribe(observer);

  expect(observer.callCount).toBe(2);
  expect(observer.calls).toEqual([[1], [2]]);
  expect(observer.calls).not.toEqual([[1], [2], [3]]);
});

test("the complete callback is not called if an error occurred", () => {
  const observable = new Observable((observer) => {
    observer.error?.("💣");
    observer.complete?.();
  });

  const complete = spy();
  observable.subscribe({ complete, error() {} });

  expect(complete.called).toBe(false);
});

test("the error callback is not called if an observable completed", () => {
  const observable = new Observable((observer) => {
    observer.complete?.();
    observer.error?.("💣");
  });

  const error = spy();
  observable.subscribe({ error });

  expect(error.called).toBe(false);
});

test("unsubscribing from an observable", () => {
  const clock = useFakeTimers();

  const observable = new Observable<number>((observer) => {
    observer.next?.(1);
    setTimeout(() => observer.next?.(2));
  });

  const next = spy();
  const { unsubscribe } = observable.subscribe({ next });

  unsubscribe();
  clock.runAll();
  clock.uninstall();
  expect(next.callCount).toBe(1);
});

test("unsubscribing from an observable that errored does not call the clean up function twice", () => {
  const cleanUp = spy();
  const observable = new Observable((observer) => {
    observer.complete?.();
    return cleanUp;
  });

  const { unsubscribe } = observable.subscribe({});
  unsubscribe();
  expect(cleanUp.callCount).toBe(1);
});

test("unsubscribing from an observable that completed does not call the clean up function twice", () => {
  const cleanUp = spy();
  const observable = new Observable((observer) => {
    observer.complete?.();
    return cleanUp;
  });

  const { unsubscribe } = observable.subscribe({});
  unsubscribe();
  expect(cleanUp.callCount).toBe(1);
});

test("the cleanup function is called on error", () => {
  const cleanUp = spy();

  const observable = new Observable((observer) => {
    observer.error?.("💣");
    return cleanUp;
  });

  try {
    observable.subscribe({});
  } catch (e) {
    // empty
  }

  expect(cleanUp.callCount).toBe(1);
  expect(cleanUp.calls).toEqual([[]]);
});

test("the cleanup function is called on complete", () => {
  const cleanUp = spy();

  const observable = new Observable((observer) => {
    observer.complete?.();
    return cleanUp;
  });

  observable.subscribe({});
  expect(cleanUp.callCount).toBe(1);
  expect(cleanUp.calls).toEqual([[]]);
});

test("the cleanup function is called on unsubscribe", () => {
  const cleanUp = spy();

  const observable = new Observable((_observer) => cleanUp);
  const { unsubscribe } = observable.subscribe({ next() {} });

  unsubscribe();
  expect(cleanUp.callCount).toBe(1);
  expect(cleanUp.calls).toEqual([[]]);
});

test("the cleanup function is not called if the observable never completes", () => {
  const cleanUp = spy();
  const observable = new Observable((_observer) => cleanUp);

  observable.subscribe({ next() {} });
  expect(cleanUp.called).toBe(false);
});

test("the of static constructor completes the observable after all values are emitted", () => {
  const observable = Observable.of(1, 2);
  const complete = spy();
  observable.subscribe({ complete });
  expect(complete.callCount).toBe(1);
});

test("the from static constructor creates an observable from an observable like", () => {
  const observable = Observable.from({
    subscribe(observerOrNext) {
      const observer =
        typeof observerOrNext === "function"
          ? { next: observerOrNext }
          : observerOrNext;

      observer?.next?.(1);
      return { unsubscribe() {} };
    }
  });

  const next = spy();
  observable.subscribe(next);

  expect(observable.constructor).toBe(Observable);
  expect(observable instanceof Observable).toBe(true);
  expect(next.callCount).toBe(1);
  expect(next.calls).toEqual([[1]]);
});
