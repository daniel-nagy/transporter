import { install as useFakeTimers } from "@sinonjs/fake-timers";
import { expect, test } from "bun:test";

import { BehaviorSubject } from './BehaviorSubject.js';
import { EmptyError, firstValueFrom } from './firstValueFrom.js';
import { Observable } from './Observable.js';

test("getting the first value from an observable", async () => {
  const observable = Observable.of(1, 2, 3);
  expect(await firstValueFrom(observable)).toBe(1);
});

test("async first value", async () => {
  const clock = useFakeTimers();

  const observable = new Observable((observer) => {
    setTimeout(() => observer.next?.(1));
  });

  const promise = firstValueFrom(observable);

  clock.runAll();
  clock.uninstall();
  expect(await promise).toBe(1);
});

test("the promise is rejected if the observable completes without emitting any values", () => {
  const observable = new Observable((observer) => {
    observer.complete?.();
  });

  expect(firstValueFrom(observable)).rejects.toBeInstanceOf(EmptyError);
});

test("the promise is rejected if the observable errors before a value is emitted", () => {
  const observable = new Observable((observer) => {
    observer.error?.("💣");
  });

  expect(firstValueFrom(observable)).rejects.toBe("💣");
});

test("getting the value of a behavior subject", async () => {
  expect(await firstValueFrom(new BehaviorSubject(32))).toBe(32);
});
