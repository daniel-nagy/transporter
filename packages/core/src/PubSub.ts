import type { ObservableLike } from "./Observable/index.js";

/**
 * Represents a remote subscription.
 */
export type RemoteSubscription = {
  unsubscribe(): Promise<void>;
};

/**
 * An observer for a remote subscription.
 */
export type AsyncObserver<T> = {
  next?(value: T): Promise<void>;
  error?(error: unknown): Promise<void>;
  complete?(): Promise<void>;
};

/**
 * A `PubSub` is an observable with asynchronous subscribe and unsubscribe
 * methods.
 */
export interface PubSub<T = unknown> {
  subscribe(
    observerOrNext: AsyncObserver<T> | ((value: T) => Promise<void>)
  ): Promise<RemoteSubscription>;
}

export type { PubSub as t };

/**
 * Creates a `PubSub` from an `ObservableLike`.
 */
export function from<T>(observable: ObservableLike<T>): PubSub<T> {
  return {
    subscribe: async (
      observer: AsyncObserver<T> | ((value: T) => Promise<void>)
    ) => {
      const subscription = observable.subscribe(observer);

      return {
        unsubscribe: async () => subscription.unsubscribe()
      };
    }
  };
}
