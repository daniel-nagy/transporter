import {
  BehaviorSubject,
  EmptyError,
  firstValueFrom,
  Observable,
  Subject,
} from "./Observable";

describe("observable", () => {
  test("subscribing to an observable", () => {
    const observable = Observable.of(5);
    const observer = jest.fn();
    observable.subscribe(observer);

    expect(observer).toHaveBeenCalledTimes(1);
    expect(observer).toHaveBeenCalledWith(5);
  });

  test("subscribing to the same observable more than once", () => {
    const observable = Observable.of(5);
    const observer0 = jest.fn();
    const observer1 = jest.fn();
    observable.subscribe(observer0);
    observable.subscribe(observer1);

    expect(observer0).toHaveBeenCalledTimes(1);
    expect(observer1).toHaveBeenCalledTimes(1);
    expect(observer0).toHaveBeenCalledWith(5);
    expect(observer1).toHaveBeenCalledWith(5);
  });

  test("emitting multiple values", () => {
    const observable = Observable.of(1, 2, 3);
    const observer = jest.fn();
    observable.subscribe(observer);

    expect(observer).toHaveBeenCalledTimes(3);
    expect(observer).toHaveBeenCalledWith(1);
    expect(observer).toHaveBeenCalledWith(2);
    expect(observer).toHaveBeenCalledWith(3);
  });

  test("an observable that emits an error", () => {
    const observable = new Observable((observer) => {
      observer.error("💣");
    });

    const error = jest.fn();
    observable.subscribe({ error });

    expect(error).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledWith("💣");
  });

  test("the error is thrown if there is no error handler", async () => {
    const observable = new Observable((observer) => {
      observer.error("💣");
    });

    expect(() => observable.subscribe({})).toThrow("💣");
  });

  test("an observable that completes", () => {
    const observable = new Observable((observer) => {
      observer.complete();
    });

    const complete = jest.fn();
    observable.subscribe({ complete });

    expect(complete).toHaveBeenCalledTimes(1);
    expect(complete).toHaveBeenCalledWith();
  });

  test("the error callback is only called once", () => {
    const observable = new Observable((observer) => {
      observer.error("💣");
      observer.error("💣");
    });

    const error = jest.fn();
    observable.subscribe({ error });

    expect(error).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledWith("💣");
  });

  test("the complete callback is only called once", () => {
    const observable = new Observable((observer) => {
      observer.complete();
      observer.complete();
    });

    const complete = jest.fn();
    observable.subscribe({ complete });

    expect(complete).toHaveBeenCalledTimes(1);
    expect(complete).toHaveBeenCalledWith();
  });

  test("new values are not emitted after an observable errors", () => {
    const observable = new Observable<number>((observer) => {
      observer.next(1);
      observer.next(2);
      observer.error("💣");
      observer.next(3);
    });

    const next = jest.fn();
    observable.subscribe({ next, error() {} });

    expect(next).toHaveBeenCalledTimes(2);
    expect(next).toHaveBeenCalledWith(1);
    expect(next).toHaveBeenCalledWith(2);
    expect(next).not.toHaveBeenCalledWith(3);
  });

  test("new values are not emitted after an observable completes", () => {
    const observable = new Observable<number>((observer) => {
      observer.next(1);
      observer.next(2);
      observer.complete();
      observer.next(3);
    });

    const observer = jest.fn();
    observable.subscribe(observer);

    expect(observer).toHaveBeenCalledTimes(2);
    expect(observer).toHaveBeenCalledWith(1);
    expect(observer).toHaveBeenCalledWith(2);
    expect(observer).not.toHaveBeenCalledWith(3);
  });

  test("the complete callback is not called if an error occurred", () => {
    const observable = new Observable((observer) => {
      observer.error("💣");
      observer.complete();
    });

    const complete = jest.fn();
    observable.subscribe({ complete, error() {} });

    expect(complete).not.toHaveBeenCalled();
  });

  test("the error callback is not called if an observable completed", () => {
    const observable = new Observable((observer) => {
      observer.complete();
      observer.error("💣");
    });

    const error = jest.fn();
    observable.subscribe({ error });

    expect(error).not.toHaveBeenCalled();
  });

  test("unsubscribing from an observable", () => {
    jest.useFakeTimers();

    const observable = new Observable<number>((observer) => {
      observer.next(1);
      setTimeout(() => observer.next(2));
    });

    const next = jest.fn();
    const { unsubscribe } = observable.subscribe({ next });

    unsubscribe();
    jest.runAllTimers();
    jest.useRealTimers();
    expect(next).toHaveBeenCalledTimes(1);
  });

  test("unsubscribing from an observable that errored does not call the clean up function twice", () => {
    const cleanUp = jest.fn();
    const observable = new Observable((observer) => {
      observer.complete();
      return cleanUp;
    });

    const { unsubscribe } = observable.subscribe({});
    unsubscribe();
    expect(cleanUp).toHaveBeenCalledTimes(1);
  });

  test("unsubscribing from an observable that completed does not call the clean up function twice", () => {
    const cleanUp = jest.fn();
    const observable = new Observable((observer) => {
      observer.complete();
      return cleanUp;
    });

    const { unsubscribe } = observable.subscribe({});
    unsubscribe();
    expect(cleanUp).toHaveBeenCalledTimes(1);
  });

  test("the cleanup function is called on error", () => {
    const cleanUp = jest.fn();

    const observable = new Observable((observer) => {
      observer.error("💣");
      return cleanUp;
    });

    try {
      observable.subscribe({});
    } catch (e) {}

    expect(cleanUp).toBeCalledTimes(1);
    expect(cleanUp).toHaveBeenCalledWith();
  });

  test("the cleanup function is called on complete", () => {
    const cleanUp = jest.fn();

    const observable = new Observable((observer) => {
      observer.complete();
      return cleanUp;
    });

    observable.subscribe({});
    expect(cleanUp).toBeCalledTimes(1);
    expect(cleanUp).toHaveBeenCalledWith();
  });

  test("the cleanup function is called on unsubscribe", () => {
    const cleanUp = jest.fn();

    const observable = new Observable((observer) => cleanUp);
    const { unsubscribe } = observable.subscribe({ next() {} });

    unsubscribe();
    expect(cleanUp).toBeCalledTimes(1);
    expect(cleanUp).toHaveBeenCalledWith();
  });

  test("the cleanup function is not called if the observable never completes", () => {
    const cleanUp = jest.fn();
    const observable = new Observable((_observer) => cleanUp);

    observable.subscribe({ next() {} });
    expect(cleanUp).not.toHaveBeenCalled();
  });

  test("the of static constructor completes the observable after all values are emitted", () => {
    const observable = Observable.of(1, 2);
    const complete = jest.fn();
    observable.subscribe({ complete });
    expect(complete).toHaveBeenCalledTimes(1);
  });

  test("the from static constructor creates an observable from an observable like", () => {
    const observable = Observable.from({
      subscribe(observerOrNext) {
        const observer =
          typeof observerOrNext === "function"
            ? { next: observerOrNext }
            : observerOrNext;

        observer.next?.(1);
        return { unsubscribe() {} };
      },
    });

    const next = jest.fn();
    observable.subscribe(next);

    expect(observable.constructor).toBe(Observable);
    expect(observable instanceof Observable).toBe(true);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(1);
  });
});

describe("subject", () => {
  test("subscribing to a subject", () => {
    const subject = new Subject();
    const next = jest.fn();

    subject.subscribe({ next });
    subject.next(8);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(8);
  });

  test("emitting multiple values", () => {
    const subject = new Subject();
    const next = jest.fn();

    subject.subscribe({ next });
    subject.next(1);
    subject.next(2);
    subject.next(3);

    expect(next).toHaveBeenCalledTimes(3);
    expect(next).toHaveBeenCalledWith(1);
    expect(next).toHaveBeenCalledWith(2);
    expect(next).toHaveBeenCalledWith(3);
  });

  test("a subject does not replay its values", () => {
    const subject = new Subject();
    const next1 = jest.fn();
    const next2 = jest.fn();
    const next3 = jest.fn();

    subject.subscribe(next1);
    subject.next(1);
    subject.subscribe(next2);
    subject.next(2);
    subject.subscribe(next3);
    subject.next(3);

    expect(next1).toHaveBeenCalledTimes(3);
    expect(next2).toHaveBeenCalledTimes(2);
    expect(next3).toHaveBeenCalledTimes(1);
    expect(next1).toHaveBeenCalledWith(1);
    expect(next1).toHaveBeenCalledWith(2);
    expect(next1).toHaveBeenCalledWith(3);
    expect(next2).toHaveBeenCalledWith(2);
    expect(next2).toHaveBeenCalledWith(3);
    expect(next3).toHaveBeenCalledWith(3);
  });

  test("a subject that emits an error", () => {
    const subject = new Subject();
    const error = jest.fn();

    subject.subscribe({ error });
    subject.error("💣");

    expect(error).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledWith("💣");
  });

  test("the error is thrown if at least one observer has no error handler", async () => {
    const subject = new Subject();
    subject.subscribe({ error() {} });
    subject.subscribe({});
    expect(() => subject.error("💣")).toThrow("💣");
  });

  test("an subject that completes", () => {
    const observable = new Subject();
    const complete = jest.fn();

    observable.subscribe({ complete });
    observable.complete();

    expect(complete).toHaveBeenCalledTimes(1);
    expect(complete).toHaveBeenCalledWith();
  });

  test("the error callback is only called once", () => {
    const observable = new Subject();
    const error = jest.fn();

    observable.subscribe({ error });
    observable.error("💣");
    observable.error("💣");

    expect(error).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledWith("💣");
  });

  test("the complete callback is only called once", () => {
    const observable = new Subject();
    const complete = jest.fn();

    observable.subscribe({ complete });
    observable.complete();
    observable.complete();

    expect(complete).toHaveBeenCalledTimes(1);
    expect(complete).toHaveBeenCalledWith();
  });

  test("new values are not emitted after a subject errors", () => {
    const observable = new Subject<number>();
    const next = jest.fn();

    observable.subscribe({ next, error() {} });
    observable.next(1);
    observable.next(2);
    observable.error("💣");
    observable.next(3);

    expect(next).toHaveBeenCalledTimes(2);
    expect(next).toHaveBeenCalledWith(1);
    expect(next).toHaveBeenCalledWith(2);
    expect(next).not.toHaveBeenCalledWith(3);
  });

  test("new values are not emitted after an subject completes", () => {
    const observable = new Subject<number>();

    const observer = jest.fn();
    observable.subscribe(observer);
    observable.next(1);
    observable.next(2);
    observable.complete();
    observable.next(3);

    expect(observer).toHaveBeenCalledTimes(2);
    expect(observer).toHaveBeenCalledWith(1);
    expect(observer).toHaveBeenCalledWith(2);
    expect(observer).not.toHaveBeenCalledWith(3);
  });

  test("the complete callback is not called if an error occurred", () => {
    const observable = new Subject();
    const complete = jest.fn();

    observable.subscribe({ complete, error() {} });
    observable.error("💣");
    observable.complete();

    expect(complete).not.toHaveBeenCalled();
  });

  test("the error callback is not called if an subject completed", () => {
    const observable = new Subject();
    const error = jest.fn();

    observable.subscribe({ error });
    observable.complete();
    observable.error("💣");

    expect(error).not.toHaveBeenCalled();
  });

  test("unsubscribing from a subject", () => {
    jest.useFakeTimers();

    const observable = new Subject<number>();
    const next = jest.fn();
    const { unsubscribe } = observable.subscribe({ next });

    observable.next(1);
    setTimeout(() => observable.next(2));
    unsubscribe();
    jest.runAllTimers();
    jest.useRealTimers();
    expect(next).toHaveBeenCalledTimes(1);
  });

  test("The complete callback is called if subscribing to a completed subject", () => {
    const observable = new Subject();
    const complete = jest.fn();
    observable.complete();
    observable.subscribe({ complete });
    expect(complete).toHaveBeenCalledTimes(1);
    expect(complete).toHaveBeenCalledWith();
  });

  test("The error callback is called if subscribing to a subject that errored", () => {
    const observable = new Subject();
    const error = jest.fn();
    observable.error("💣");
    observable.subscribe({ error });
    expect(error).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledWith("💣");
  });

  test("The error is thrown if subscribing to a subject that errored without an error handler", () => {
    const observable = new Subject();
    observable.error("💣");
    expect(() => observable.subscribe({})).toThrow("💣");
  });
});

describe("behavior subject", () => {
  test("a behavior subject replays its value on subscribe", () => {
    const observable = new BehaviorSubject(3);
    const next = jest.fn();
    observable.subscribe({ next });
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(3);
  });

  test("a behavior subject replays its last value on subscribe", () => {
    const observable = new BehaviorSubject(1);
    const next = jest.fn();
    observable.next(2);
    observable.next(3);
    observable.subscribe({ next });
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(3);
  });

  test("subscribing to an errored behavior subject does not replay its value", () => {
    const observable = new BehaviorSubject(1);
    const error = jest.fn();
    const next = jest.fn();
    observable.error("💣");
    observable.subscribe({ next, error });
    expect(error).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledWith("💣");
    expect(next).not.toHaveBeenCalled();
  });

  test("subscribing to a completed behavior subject does not replay its value", () => {
    const observable = new BehaviorSubject(1);
    const complete = jest.fn();
    const next = jest.fn();
    observable.complete();
    observable.subscribe({ complete, next });
    expect(complete).toHaveBeenCalledTimes(1);
    expect(complete).toHaveBeenCalledWith();
    expect(next).not.toHaveBeenCalled();
  });

  test("imperatively getting a behavior subject's value", () => {
    const observable = new BehaviorSubject(1);
    expect(observable.getValue()).toBe(1);
  });

  test("imperatively getting a completed behavior subject's value", () => {
    const observable = new BehaviorSubject(1);
    observable.complete();
    expect(observable.getValue()).toBe(1);
  });

  test("imperatively getting an errored behavior subject's value with throw", () => {
    const observable = new BehaviorSubject(1);
    observable.error("💣");
    expect(() => observable.getValue()).toThrow("💣");
  });

  // This behavior is different than RxJS v7.x
  test("a behavior subject's value does not change after it is complete", () => {
    const observable = new BehaviorSubject(1);
    observable.complete();
    observable.next(2);
    expect(observable.getValue()).toBe(1);
  });

  test("as an observable", () => {
    const observable = new BehaviorSubject(99).asObservable();
    const next = jest.fn();

    observable.subscribe(next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenLastCalledWith(99);
  });
});

describe("firstValueFrom", () => {
  test("getting the first value from an observable", async () => {
    const observable = Observable.of(1, 2, 3);
    expect(await firstValueFrom(observable)).toBe(1);
  });

  test("async first value", async () => {
    jest.useFakeTimers();

    const observable = new Observable((observer) => {
      setTimeout(() => observer.next(1));
    });

    const promise = firstValueFrom(observable);

    jest.runAllTimers();
    jest.useRealTimers();
    expect(await promise).toBe(1);
  });

  test("the promise is rejected if the observable completes without emitting any values", async () => {
    const observable = new Observable((observer) => {
      observer.complete();
    });

    await expect(firstValueFrom(observable)).rejects.toThrow(EmptyError);
  });

  test("the promise is rejected if the observable errors before a value is emitted", async () => {
    const observable = new Observable((observer) => {
      observer.error("💣");
    });

    await expect(firstValueFrom(observable)).rejects.toBe("💣");
  });

  test("getting the value of a behavior subject", async () => {
    expect(await firstValueFrom(new BehaviorSubject(32))).toBe(32);
  });
});
