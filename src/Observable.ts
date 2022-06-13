import type { Event, EventTargetLike } from "./event-target";

export class EmptyError extends Error {
  readonly name = "EmptyError";

  constructor(message?: string) {
    super(message);
    // TypeScript cannot properly extend the native Error class when targeting
    // ES5. See https://stackoverflow.com/a/41102306.
    Object.setPrototypeOf(this, EmptyError.prototype);
  }
}

export interface ObservableLike<T> {
  subscribe(
    observerOrNext: Partial<Observer<T>> | ((value: T) => void)
  ): Subscription;
}

export type Observer<T> = {
  next(value: T): void;
  error(error: unknown): void;
  complete(): void;
};

export type Subscription = {
  unsubscribe(): void;
};

enum ObservableState {
  Complete = "complete",
  Error = "error",
  NotComplete = "not_complete",
  Unsubscribed = "unsubscribed",
}

export class Observable<T> implements ObservableLike<T> {
  static from<T>(observable: ObservableLike<T>): Observable<T> {
    return Object.create(Observable.prototype, {
      subscribe: { value: observable.subscribe.bind(observable) },
    });
  }

  static of<T>(...values: [T, ...T[]]) {
    return new Observable<T>((observer) => {
      values.forEach((value) => observer.next(value));
      observer.complete();
    });
  }

  private _subscribe: (observer: Partial<Observer<T>>) => () => void;

  constructor(subscribe: (observer: Observer<T>) => (() => void) | void) {
    this._subscribe = (observer: Partial<Observer<T>>) => {
      let errorRef: unknown = undefined;
      let state = ObservableState.NotComplete;
      let subscribeComplete = false;
      let throwError = false;

      const cleanUp = subscribe({
        next: (value) => {
          if (state !== ObservableState.NotComplete) return;
          observer.next?.(value);
        },
        complete: () => {
          if (state !== ObservableState.NotComplete) return;
          state = ObservableState.Complete;
          observer.complete?.();
          subscribeComplete && cleanUp?.();
        },
        error: (error) => {
          if (state !== ObservableState.NotComplete) return;
          state = ObservableState.Error;
          observer.error?.(error);
          subscribeComplete && cleanUp?.();

          if (!observer.error) {
            if (subscribeComplete) {
              throw error;
            } else {
              errorRef = error;
              throwError = true;
            }
          }
        },
      });

      subscribeComplete = true;

      if (state !== ObservableState.NotComplete) {
        cleanUp?.();
      }

      if (throwError) throw errorRef;

      return () => {
        if (state !== ObservableState.NotComplete) return;
        state = ObservableState.Unsubscribed;
        cleanUp?.();
      };
    };
  }

  subscribe(
    observerOrNext: Partial<Observer<T>> | ((value: T) => void)
  ): Subscription {
    const cleanUp = this._subscribe(toObserver(observerOrNext));

    return {
      unsubscribe() {
        cleanUp();
      },
    };
  }
}

export class Subject<T> implements ObservableLike<T> {
  protected _error?: unknown;
  protected _observers: Partial<Observer<T>>[] = [];
  protected _state = ObservableState.NotComplete;

  asObservable(): Observable<T> {
    return Observable.from(this);
  }

  complete() {
    if (this._state !== ObservableState.NotComplete) return;
    this._state = ObservableState.Complete;
    const observers = [...this._observers];
    this._observers = [];
    observers.forEach((observer) => observer.complete?.());
  }

  error(error: unknown) {
    if (this._state !== ObservableState.NotComplete) return;
    this._state = ObservableState.Error;
    this._error = error;
    const observers = [...this._observers];
    this._observers = [];

    observers.forEach((observer) => {
      if (!observer.error) throw error;
      observer.error(error);
    });
  }

  next(value: T) {
    if (this._state !== ObservableState.NotComplete) return;
    [...this._observers].forEach((observer) => observer.next?.(value));
  }

  subscribe(
    observerOrNext: Partial<Observer<T>> | ((value: T) => void)
  ): Subscription {
    const observer = toObserver(observerOrNext);

    if (this._state === ObservableState.Complete) observer.complete?.();

    if (this._state === ObservableState.Error) {
      if (!observer.error) throw this._error;
      observer.error(this._error);
    }

    if (this._state !== ObservableState.NotComplete)
      return { unsubscribe() {} };

    this._observers = [...this._observers, observer];

    return {
      unsubscribe: () => {
        this._observers = this._observers.filter((item) => item !== observer);
      },
    };
  }
}

export class BehaviorSubject<T> extends Subject<T> {
  constructor(private _value: T) {
    super();
  }

  getValue() {
    if (this._state === ObservableState.Error) throw this._error;
    return this._value;
  }

  next(value: T): void {
    if (this._state === ObservableState.NotComplete) this._value = value;
    super.next(value);
  }

  subscribe(
    observerOrNext: Partial<Observer<T>> | ((value: T) => void)
  ): Subscription {
    const observer = toObserver(observerOrNext);

    if (this._state === ObservableState.NotComplete)
      observer.next?.(this._value);

    return super.subscribe(observer);
  }
}

export function filter<T, S extends T>(
  observable: ObservableLike<T>,
  callback: ((value: T) => value is S) | ((value: T) => boolean)
): ObservableLike<S> {
  return new Observable((observer) => {
    const innerSubscription = observable.subscribe({
      ...observer,
      next: (value) => callback(value) && observer.next(value),
    });

    return () => innerSubscription.unsubscribe();
  });
}

export function firstValueFrom<T>(observable: ObservableLike<T>) {
  return new Promise<T>((resolve, reject) =>
    observable.subscribe({
      next: resolve,
      complete: () =>
        reject(
          new EmptyError("The observable completed before emitting a value.")
        ),
      error: reject,
    })
  );
}

export function flatMap<T, U>(
  observable: ObservableLike<T>,
  callback: (value: T) => ObservableLike<U>
): ObservableLike<U> {
  return new Observable((observer) => {
    const subscriptions: Subscription[] = [];

    subscriptions.push(
      observable.subscribe({
        error: observer.error,
        next: (value) =>
          subscriptions.push(callback(value).subscribe(observer)),
      })
    );

    return () => subscriptions.forEach(({ unsubscribe }) => unsubscribe());
  });
}

export function fromEvent<T extends Event>(
  target: EventTargetLike,
  event: string
) {
  return new Observable<T>(({ next }) => {
    const eventListener = (event: T) => next(event);
    target.addEventListener(event, eventListener);
    return () => target.removeEventListener(event, eventListener);
  });
}

export function map<T, U>(
  observable: ObservableLike<T>,
  callback: (value: T) => U
): ObservableLike<U> {
  return new Observable((observer) => {
    const innerSubscription = observable.subscribe({
      ...observer,
      next: (value) => observer.next(callback(value)),
    });

    return () => innerSubscription.unsubscribe();
  });
}

export function merge<T>(
  ...observables: ObservableLike<T>[]
): ObservableLike<T> {
  return new Observable((observer) => {
    if (observables.length === 0) return observer.complete();

    let completedState = 0;

    const innerObserver = {
      ...observer,
      complete() {
        completedState += 1;
        if (completedState >= observables.length) observer.complete();
      },
    };

    const subscriptions = observables.map((observable) =>
      observable.subscribe(innerObserver)
    );

    return () => subscriptions.forEach(({ unsubscribe }) => unsubscribe());
  });
}

export function take<T>(
  observable: ObservableLike<T>,
  amount: number
): ObservableLike<T> {
  return new Observable((observer) => {
    if (amount <= 0) return observer.complete();

    let remaining = amount;

    const innerSubscription = observable.subscribe({
      ...observer,
      next: (value) => {
        observer.next(value);
        remaining = remaining - 1;
        if (remaining === 0) observer.complete();
      },
    });

    return () => innerSubscription.unsubscribe();
  });
}

export function tap<T, S>(
  observable: ObservableLike<T>,
  callback: (value: S & T) => void
): ObservableLike<T> {
  return new Observable((observer) => {
    const innerSubscription = observable.subscribe({
      ...observer,
      next: (value) => {
        callback(value as S & T);
        observer.next(value);
      },
    });

    return () => innerSubscription.unsubscribe();
  });
}

function toObserver<T>(
  observerOrNext: Partial<Observer<T>> | ((value: T) => void)
): Partial<Observer<T>> {
  return typeof observerOrNext === "function"
    ? { next: observerOrNext }
    : observerOrNext;
}
