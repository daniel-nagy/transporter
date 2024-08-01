import * as Fiber from "./Fiber.js";
import * as Metadata from "./Metadata.js";
import * as Observable from "./Observable/index.js";

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
export function from<T>(observable: Observable.ObservableLike<T>): PubSub<T> {
  return {
    subscribe: async (
      observer: AsyncObserver<T> | ((value: T) => Promise<void>)
    ) => {
      const metadata = Metadata.get(observer);
      const agent = metadata && Fiber.get(metadata.clientAgentId);
      const subscription = observable.subscribe(observer);

      const innerSubscription = agent?.stateChange.subscribe((state) => {
        switch (state) {
          case Fiber.State.Terminated:
            subscription.unsubscribe();
        }
      });

      return {
        unsubscribe: async () => {
          innerSubscription?.unsubscribe();
          subscription.unsubscribe();
        }
      };
    }
  };
}
