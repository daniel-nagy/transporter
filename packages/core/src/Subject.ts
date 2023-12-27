import * as Observable from "./Observable/index.js";

export { Subject as t };

/**
 * A `Subject` is both an observable and an observer. A subject can be used to
 * multicast an observable.
 *
 * @example
 *
 * const subject = new Subject<number>();
 *
 * subject.next(1);
 * subject.subscribe(console.log);
 * subject.next(2); // logs the value 2
 */
export class Subject<T> implements Observable.ObservableLike<T> {
  protected failure?: unknown;
  protected observers: Observable.Observer<T>[] = [];
  protected state = Observable.State.NotComplete;

  /**
   * Transforms the subject into a hot observable.
   */
  asObservable(): Observable.t<T> {
    return Observable.from(this);
  }

  complete() {
    if (this.state !== Observable.State.NotComplete) return;
    this.state = Observable.State.Complete;
    const observers = [...this.observers];
    this.observers = [];
    observers.forEach((observer) => observer.complete?.());
  }

  error(error: unknown) {
    if (this.state !== Observable.State.NotComplete) return;
    this.state = Observable.State.Error;
    this.failure = error;
    const observers = [...this.observers];
    this.observers = [];

    observers.forEach((observer) => {
      if (!observer.error) throw error;
      observer.error(error);
    });
  }

  next(value: T) {
    if (this.state !== Observable.State.NotComplete) return;
    [...this.observers].forEach((observer) => observer.next?.(value));
  }

  subscribe(
    observerOrNext?: Observable.Observer<T> | ((value: T) => void)
  ): Observable.Subscription {
    const observer = Observable.toObserver(observerOrNext);

    if (this.state === Observable.State.Complete) observer.complete?.();

    if (this.state === Observable.State.Error) {
      if (!observer.error) throw this.failure;
      observer.error(this.failure);
    }

    if (this.state !== Observable.State.NotComplete)
      return { unsubscribe() {} };

    this.observers = [...this.observers, observer];

    return {
      unsubscribe: () => {
        this.observers = this.observers.filter((item) => item !== observer);
      }
    };
  }
}

export function init<T>(): Subject<T> {
  return new Subject<T>();
}
