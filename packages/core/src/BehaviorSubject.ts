import * as Observable from "./Observable/index.js";
import * as Subject from "./Subject.js";

export { BehaviorSubject as t };

/**
 * A `BehaviorSubject` is a `Subject` that replays the most recent value when
 * subscribed to.
 *
 * @example
 *
 *  const behaviorSubject = new BehaviorSubject<number>();
 *
 * behaviorSubject.next(1);
 * behaviorSubject.next(2);
 * behaviorSubject.subscribe(console.log); // logs the value 2
 * behaviorSubject.next(3); // logs the value 3
 */
export class BehaviorSubject<T> extends Subject.t<T> {
  #value: T;

  constructor(value: T) {
    super();
    this.#value = value;
  }

  getValue() {
    if (this.state === Observable.State.Error) throw this.failure;
    return this.#value;
  }

  next(value: T): void {
    if (this.state === Observable.State.NotComplete) this.#value = value;
    super.next(value);
  }

  subscribe(
    observerOrNext?: Observable.Observer<T> | ((value: T) => void)
  ): Observable.Subscription {
    const observer = Observable.toObserver(observerOrNext);

    if (this.state === Observable.State.NotComplete)
      observer.next?.(this.#value);

    return super.subscribe(observer);
  }
}

export function of<T>(value: T): BehaviorSubject<T> {
  return new BehaviorSubject(value);
}
