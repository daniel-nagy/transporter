import { Observable } from "./Observable.js";

export interface Event {
  type: string;
}

export interface EventTarget {
  addEventListener<E extends Event>(
    type: string,
    callback: (event: E) => void
  ): void;
  dispatchEvent(event: Event): boolean;
  removeEventListener<E extends Event>(
    type: string,
    callback: (event: E) => void
  ): void;
}

/**
 * Creates a hot observable from an event target and an event type.
 */
export function fromEvent<T extends Event>(target: EventTarget, type: string) {
  return new Observable<T>(({ next }) => {
    const eventListener = (event: T) => next?.(event);
    target.addEventListener(type, eventListener);
    return () => target.removeEventListener(type, eventListener);
  });
}
