export interface Event {
  type: string;
}

export interface EventTargetLike {
  addEventListener<E extends Event, T extends string = string>(
    type: T,
    callback: (event: T extends "message" ? MessageEvent : E) => void
  ): void;
  dispatchEvent<E extends { type: string }>(event: E): void;
  removeEventListener<E extends Event>(
    type: string,
    callback: (event: E) => void
  ): void;
}

export interface MessageEvent extends Event {
  data: string;
  type: "message";
}

export interface MessagePortLike extends EventTargetLike {
  postMessage(message: string): void;
}

export type PortProxyHandler = {
  addEventListener<E extends Event>(
    port: MessagePortLike,
    type: string,
    callback: (event: E) => void
  ): void;
  dispatchEvent<E extends Event>(port: MessagePortLike, event: E): void;
  postMessage(port: MessagePortLike, message: string): void;
  removeEventListener<E extends Event>(
    port: MessagePortLike,
    type: string,
    callback: (event: E) => void
  ): void;
};

export function createEventTarget(): EventTargetLike {
  const callbackMap = new Map<string, Function[]>();
  const getCallbacks = (type: string) => callbackMap.get(type) ?? [];

  return {
    addEventListener: (type, callback) =>
      callbackMap.set(type, [...getCallbacks(type), callback]),
    dispatchEvent: (event) =>
      getCallbacks(event.type).forEach((callback) => callback(event)),
    removeEventListener: (type, callback) =>
      callbackMap.set(
        type,
        getCallbacks(type).filter((cb) => cb !== callback)
      ),
  };
}

export function createMessageChannel() {
  const p1 = createMessagePort();
  const p2 = createMessagePort();
  return [link(p1, p2), link(p2, p1)];
}

export function createMessagePort(link?: EventTargetLike) {
  return {
    ...createEventTarget(),
    postMessage(message: string) {
      link?.dispatchEvent({ type: "message", data: message });
    },
  };
}

export function filterEvent<E extends Event>(
  type: string,
  target: EventTargetLike,
  predicate: (event: E) => boolean
): EventTargetLike {
  const dest = createEventTarget();

  target.addEventListener<E>(type, (event) => {
    if (predicate(event)) dest.dispatchEvent(event);
  });

  return dest;
}

export function forwardEvent(
  type: string,
  t1: EventTargetLike,
  t2: EventTargetLike
) {
  t1.addEventListener(type, (event) => t2.dispatchEvent(event));
}

export function link(port: MessagePortLike, target: EventTargetLike) {
  return proxy(port, {
    postMessage(_port, message) {
      target.dispatchEvent({ type: "message", data: message });
    },
  });
}

export function mapEvent<E extends Event>(
  type: string,
  target: EventTargetLike,
  eventProxy: (event: E) => Event
): EventTargetLike {
  const dest = createEventTarget();

  target.addEventListener<E>(type, (event) =>
    dest.dispatchEvent(eventProxy(event))
  );

  return dest;
}

// If you proxy a callback you should maintain a WeakMap between the original
// callback and the callback proxy. When the callback is removed you should
// remove your callback proxy so the original callback can be garbage collected.
export function proxy(
  port: MessagePortLike,
  handler: Partial<PortProxyHandler>
): MessagePortLike {
  const traps: PortProxyHandler = {
    addEventListener: (port, ...args) => port.addEventListener(...args),
    dispatchEvent: (port, ...args) => port.dispatchEvent(...args),
    postMessage: (port, ...args) => port.postMessage(...args),
    removeEventListener: (port, ...args) => port.removeEventListener(...args),
    ...handler,
  };

  return {
    addEventListener: (...args) => traps.addEventListener(port, ...args),
    dispatchEvent: (...args) => traps.dispatchEvent(port, ...args),
    postMessage: (...args) => traps.postMessage(port, ...args),
    removeEventListener: (...args) => traps.removeEventListener(port, ...args),
  };
}

export function proxyEvent<E extends Event>(
  type: string,
  target: EventTargetLike,
  eventProxy: (event: E) => Event
): EventTargetLike {
  const dest = createEventTarget();

  dest.addEventListener<E>(type, (event) =>
    target.dispatchEvent(eventProxy(event))
  );

  return dest;
}

export function tapEvent<E extends Event>(
  type: string,
  target: EventTargetLike,
  eavesdropper: (event: E) => void
): EventTargetLike {
  target.addEventListener<E>(type, (event) => eavesdropper(event));
  return target;
}
