import {
  type Observer,
  type Subscription,
  ObservableState,
  toObserver
} from "./Observable.js";
import { Subject } from "./Subject.js";

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
export class BehaviorSubject<T> extends Subject<T> {
  #value: T;

  constructor(value: T) {
    super();
    this.#value = value;
  }

  getValue() {
    if (this.state === ObservableState.Error) throw this.failure;
    return this.#value;
  }

  next(value: T): void {
    if (this.state === ObservableState.NotComplete) this.#value = value;
    super.next(value);
  }

  subscribe(observerOrNext?: Observer<T> | ((value: T) => void)): Subscription {
    const observer = toObserver(observerOrNext);

    if (this.state === ObservableState.NotComplete)
      observer.next?.(this.#value);

    return super.subscribe(observer);
  }
}
