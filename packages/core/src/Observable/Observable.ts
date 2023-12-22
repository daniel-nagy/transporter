import { isPromise } from "../JsPromise.js";

export type UnaryFunction<A, B> = (a: A) => B;

export interface ObservableLike<T> {
  subscribe(observerOrNext?: Observer<T> | ((value: T) => void)): Subscription;
}

/**
 * An `Observer` subscribes to an observable.
 */
export type Observer<T> = {
  next?(value: T): void;
  error?(error: unknown): void;
  complete?(): void;
};

/**
 * An `Operator` is a function that takes an observable as input and returns a
 * new observable as output.
 */
export type Operator<T, U> = (
  observable: ObservableLike<T>
) => ObservableLike<U>;

/**
 * A `Subscription` is returned when an observer subscribes to an observable.
 */
export type Subscription = {
  unsubscribe(): void;
};

export enum ObservableState {
  Complete = "Complete",
  Error = "Error",
  NotComplete = "NotComplete",
  Unsubscribed = "Unsubscribed"
}

/**
 * Observables are lazy push data structures that can emit values both
 * synchronously and asynchronously. Observables are unicast and, unlike
 * promises, an observable may never emit or it may emit multiple values.
 *
 * @example
 *
 * ```
 * const observable = new Observable(observer => {
 *   observer.next(1);
 *   observer.next(2);
 *
 *   setTimeout(() => {
 *     observer.next(3);
 *     observer.complete();
 *   });
 * });
 *
 * // Logs the values 1 and 2 synchronously and then the value 3 asynchronously.
 * observable.subscribe(console.log);
 * ```
 *
 * @see https://reactivex.io/documentation/observable.html for an introduction
 * to observables.
 *
 * @see https://rxjs.dev for a more comprehensive observable library for
 * JavaScript.
 */
export class Observable<T> implements ObservableLike<T> {
  /**
   * Creates a new `Observable` from an object that is observable like or
   * promise like.
   *
   * @example
   *
   * Observable.from(Promise.resolve("👍"));
   */
  static from<T>(
    observable: ObservableLike<T> | PromiseLike<T>
  ): Observable<T> {
    if (isPromise(observable)) {
      return new Observable((observer: Observer<T>) => {
        observable.then(
          (value) => {
            observer.next?.(value);
            observer.complete?.();
          },
          (error: unknown) => observer.error?.(error)
        );
      });
    }

    return Object.create(Observable.prototype, {
      subscribe: { value: observable.subscribe.bind(observable) }
    });
  }

  /**
   * Creates a new `Observable` that emits each argument synchronously and then
   * completes.
   *
   * @example
   *
   * const observable = Observable.of(1, 2, 3);
   *
   * // Logs the values 1, 2, and 3 synchronously and then completes.
   * observable.subscribe(console.log);
   */
  static of<T>(...values: [T, ...T[]]) {
    return new Observable<T>((observer) => {
      values.forEach((value) => observer.next?.(value));
      observer.complete?.();
    });
  }

  #subscribe: (observer: Observer<T>) => () => void;

  constructor(subscribe: (observer: Observer<T>) => (() => void) | void) {
    this.#subscribe = (observer: Observer<T>) => {
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
        }
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

  /**
   * Allows chaining operators to perform flow control.
   *
   * @example
   *
   * Observable.of(1, "2", 3, 4.5).pipe(
   *   filter(Number.isInteger),
   *   map(num => num * 2)
   * )
   */
  pipe(): Observable<T>;
  pipe<A>(op1: UnaryFunction<Observable<T>, A>): A;
  pipe<A, B>(op1: UnaryFunction<Observable<T>, A>, op2: UnaryFunction<A, B>): B;
  pipe<A, B, C>(
    op1: UnaryFunction<Observable<T>, A>,
    op2: UnaryFunction<A, B>,
    op3: UnaryFunction<B, C>
  ): C;
  pipe<A, B, C, D>(
    op1: UnaryFunction<Observable<T>, A>,
    op2: UnaryFunction<A, B>,
    op3: UnaryFunction<B, C>,
    op4: UnaryFunction<C, D>
  ): D;
  pipe<A, B, C, D, E>(
    op1: UnaryFunction<Observable<T>, A>,
    op2: UnaryFunction<A, B>,
    op3: UnaryFunction<B, C>,
    op4: UnaryFunction<C, D>,
    op5: UnaryFunction<D, E>
  ): E;
  pipe<A, B, C, D, E, F>(
    op1: UnaryFunction<Observable<T>, A>,
    op2: UnaryFunction<A, B>,
    op3: UnaryFunction<B, C>,
    op4: UnaryFunction<C, D>,
    op5: UnaryFunction<D, E>,
    op6: UnaryFunction<E, F>
  ): F;
  pipe<A, B, C, D, E, F, G>(
    op1: UnaryFunction<Observable<T>, A>,
    op2: UnaryFunction<A, B>,
    op3: UnaryFunction<B, C>,
    op4: UnaryFunction<C, D>,
    op5: UnaryFunction<D, E>,
    op6: UnaryFunction<E, F>,
    op7: UnaryFunction<F, G>
  ): G;
  pipe<A, B, C, D, E, F, G, H>(
    op1: UnaryFunction<Observable<T>, A>,
    op2: UnaryFunction<A, B>,
    op3: UnaryFunction<B, C>,
    op4: UnaryFunction<C, D>,
    op5: UnaryFunction<D, E>,
    op6: UnaryFunction<E, F>,
    op7: UnaryFunction<F, G>,
    op8: UnaryFunction<G, H>
  ): H;
  pipe<A, B, C, D, E, F, G, H, I>(
    op1: UnaryFunction<Observable<T>, A>,
    op2: UnaryFunction<A, B>,
    op3: UnaryFunction<B, C>,
    op4: UnaryFunction<C, D>,
    op5: UnaryFunction<D, E>,
    op6: UnaryFunction<E, F>,
    op7: UnaryFunction<F, G>,
    op8: UnaryFunction<G, H>,
    op9: UnaryFunction<H, I>
  ): I;
  pipe<A, B, C, D, E, F, G, H, I>(
    op1: UnaryFunction<Observable<T>, A>,
    op2: UnaryFunction<A, B>,
    op3: UnaryFunction<B, C>,
    op4: UnaryFunction<C, D>,
    op5: UnaryFunction<D, E>,
    op6: UnaryFunction<E, F>,
    op7: UnaryFunction<F, G>,
    op8: UnaryFunction<G, H>,
    op9: UnaryFunction<H, I>,
    ...operations: Operator<unknown, unknown>[]
  ): Observable<unknown>;
  pipe<A, B, C, D, E, F, G, H, I>(
    op1: UnaryFunction<Observable<T>, A>,
    op2: UnaryFunction<A, B>,
    op3: UnaryFunction<B, C>,
    op4: UnaryFunction<C, D>,
    op5: UnaryFunction<D, E>,
    op6: UnaryFunction<E, F>,
    op7: UnaryFunction<F, G>,
    op8: UnaryFunction<G, H>,
    op9: UnaryFunction<H, I>,
    ...operations: Operator<unknown, unknown>[]
  ): unknown;

  pipe(
    ...operations: UnaryFunction<Observable<unknown>, Observable<unknown>>[]
  ) {
    return operations.reduce(
      (acc, fun) => fun(acc),
      this as Observable<unknown>
    );
  }

  /**
   * Start receiving values from this observable as they are emitted.
   */
  subscribe(observerOrNext?: Observer<T> | ((value: T) => void)): Subscription {
    const cleanUp = this.#subscribe(toObserver(observerOrNext));

    return {
      unsubscribe() {
        cleanUp();
      }
    };
  }
}

/**
 * Takes a value that may be an observer or a next function and returns an
 * observer.
 */
export function toObserver<T>(
  observerOrNext: Observer<T> | ((value: T) => void) = () => {}
): Observer<T> {
  return typeof observerOrNext === "function"
    ? { next: observerOrNext }
    : observerOrNext;
}
