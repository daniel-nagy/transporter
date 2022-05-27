import { MessagePortLike, MessageSubscriber } from ".";
import { safeParse } from "./json";
import { isObject } from "./object";
import { generateId } from "./uuid";

const MESSAGE_SOURCE = "transporter::messaging";

type MessageProxy = {
  readonly message: string;
  readonly portId: string;
  readonly source: typeof MESSAGE_SOURCE;
};

export type EventTargetLike = {
  addEventListener<E>(type: string, callback: (event: E) => void): void;
  dispatchEvent<E extends { type: string }>(event: E): void;
  removeEventListener<E>(type: string, callback: (event: E) => void): void;
};

export function createEventTarget(): EventTargetLike {
  const callbackMap = new Map<string, Function[]>();
  const getCallbacks = (type: string) => callbackMap.get(type) ?? [];

  return {
    addEventListener(type, callback) {
      callbackMap.set(type, [...getCallbacks(type), callback]);
    },
    dispatchEvent(event) {
      getCallbacks(event.type).forEach((callback) => callback(event));
    },
    removeEventListener(type, callback) {
      callbackMap.set(
        type,
        getCallbacks(type).filter((cb) => cb !== callback)
      );
    },
  };
}

export function createMessageChannel() {
  const portId = generateId();
  const t1 = createEventTarget();
  const t2 = createEventTarget();

  return [
    createMessagePort({ external: t1, internal: t2, portId }),
    createMessagePort({ external: t2, internal: t1, portId }),
  ];
}

export function createMessagePort({
  external,
  internal,
  portId,
}: {
  external: EventTargetLike;
  internal: EventTargetLike;
  portId: string;
}): MessagePortLike {
  const callbackMap = new WeakMap<MessageSubscriber, MessageSubscriber>();

  return {
    addEventListener(type, callback) {
      const callbackProxy: MessageSubscriber = (event) => {
        const data = safeParse(event.data);

        if (isMessageProxy(data) && data.portId === portId) {
          callback({ data: data.message });
        }
      };

      callbackMap.set(callback, callbackProxy);
      internal.addEventListener(type, callbackProxy);
    },
    postMessage(message: string) {
      const messageProxy: MessageProxy = {
        message,
        portId,
        source: MESSAGE_SOURCE,
      };

      external.dispatchEvent({
        data: JSON.stringify(messageProxy),
        type: "message",
      });
    },
    removeEventListener(type, callback) {
      internal.removeEventListener(type, callbackMap.get(callback) ?? callback);
    },
  };
}

function isMessageProxy(message: unknown): message is MessageProxy {
  return isObject(message) && message.source === MESSAGE_SOURCE;
}
