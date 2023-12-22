import {
  type ObservableLike,
  type Observer,
  type Subscription,
  Observable,
  ObservableState,
  toObserver
} from "./Observable.js";

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
export class Subject<T> implements ObservableLike<T> {
  protected failure?: unknown;
  protected observers: Observer<T>[] = [];
  protected state = ObservableState.NotComplete;

  /**
   * Transforms the subject into a hot observable.
   */
  asObservable(): Observable<T> {
    return Observable.from(this);
  }

  complete() {
    if (this.state !== ObservableState.NotComplete) return;
    this.state = ObservableState.Complete;
    const observers = [...this.observers];
    this.observers = [];
    observers.forEach((observer) => observer.complete?.());
  }

  error(error: unknown) {
    if (this.state !== ObservableState.NotComplete) return;
    this.state = ObservableState.Error;
    this.failure = error;
    const observers = [...this.observers];
    this.observers = [];

    observers.forEach((observer) => {
      if (!observer.error) throw error;
      observer.error(error);
    });
  }

  next(value: T) {
    if (this.state !== ObservableState.NotComplete) return;
    [...this.observers].forEach((observer) => observer.next?.(value));
  }

  subscribe(observerOrNext?: Observer<T> | ((value: T) => void)): Subscription {
    const observer = toObserver(observerOrNext);

    if (this.state === ObservableState.Complete) observer.complete?.();

    if (this.state === ObservableState.Error) {
      if (!observer.error) throw this.failure;
      observer.error(this.failure);
    }

    if (this.state !== ObservableState.NotComplete) return { unsubscribe() {} };

    this.observers = [...this.observers, observer];

    return {
      unsubscribe: () => {
        this.observers = this.observers.filter((item) => item !== observer);
      }
    };
  }
}
