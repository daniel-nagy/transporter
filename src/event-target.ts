export interface Event {
  [key: string]: any;
  type: string;
}

export interface EventTargetLike {
  addEventListener<E extends Event>(
    type: string,
    callback: (event: E) => void
  ): void;
  dispatchEvent<E extends Event>(event: E): void;
  removeEventListener<E extends Event>(
    type: string,
    callback: (event: E) => void
  ): void;
}
