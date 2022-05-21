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

  private _state = ObservableState.NotComplete;
  private _subscribe: (observer: Partial<Observer<T>>) => () => void;

  constructor(subscribe: (observer: Observer<T>) => (() => void) | void) {
    this._subscribe = (observer: Partial<Observer<T>>) => {
      let errorRef: unknown = undefined;
      let subscribeComplete = false;
      let throwError = false;

      const cleanUp = subscribe({
        next: (value) => {
          if (this._state !== ObservableState.NotComplete) return;
          observer.next?.(value);
        },
        complete: () => {
          if (this._state !== ObservableState.NotComplete) return;
          this._state = ObservableState.Complete;
          observer.complete?.();
          subscribeComplete && cleanUp?.();
        },
        error: (error) => {
          if (this._state !== ObservableState.NotComplete) return;
          this._state = ObservableState.Error;
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

      if (this._state !== ObservableState.NotComplete) {
        cleanUp?.();
      }

      if (throwError) throw errorRef;

      return () => {
        if (this._state !== ObservableState.NotComplete) return;
        this._state = ObservableState.Unsubscribed;
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

function toObserver<T>(
  observerOrNext: Partial<Observer<T>> | ((value: T) => void)
): Partial<Observer<T>> {
  return typeof observerOrNext === "function"
    ? { next: observerOrNext }
    : observerOrNext;
}
