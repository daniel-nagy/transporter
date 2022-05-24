import { MessageEvent, MessagePortLike, MessageSubscriber } from ".";

type MessageTargetLike = {
  addEventListener(type: "message", callback: MessageSubscriber): void;
  dispatchEvent(type: "message", event: MessageEvent): void;
  removeEventListener(type: "message", callback: MessageSubscriber): void;
};

const connectMessageTargets = (
  t1: MessageTargetLike,
  t2: MessageTargetLike
): MessagePortLike =>
  Object.assign(t1, {
    postMessage(message: string) {
      t2.dispatchEvent("message", { data: message });
    },
  });

const createMessageTarget = (): MessageTargetLike => {
  let messageCallbacks: MessageSubscriber[] = [];

  return {
    addEventListener(_type, callback) {
      messageCallbacks = [...messageCallbacks, callback as MessageSubscriber];
    },
    dispatchEvent(_type, event) {
      messageCallbacks.forEach((callback) => callback(event as MessageEvent));
    },
    removeEventListener(_type, callback) {
      messageCallbacks = messageCallbacks.filter((cb) => cb !== callback);
    },
  };
};

export const createMessageChannel = () => {
  const t1 = createMessageTarget();
  const t2 = createMessageTarget();
  return [connectMessageTargets(t1, t2), connectMessageTargets(t2, t1)];
};
