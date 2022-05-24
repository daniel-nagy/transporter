import {
  MessageEvent,
  MessagePortLike,
  MessageSubscriber,
  MessagingContext,
} from ".";
import { createMessageChannel } from "./messageChannel";

type CreateVirtualConnection = (context: {
  delegate(): MessagePortLike;
  port: MessagePortLike;
}) => MessagePortLike | null;

type ConnectEvent = {
  port: MessagePortLike;
};

type ConnectSubscriber = (event: ConnectEvent) => void;

type MessageTargetLike = {
  addEventListener(type: "connect", callback: ConnectSubscriber): void;
  addEventListener(type: "message", callback: MessageSubscriber): void;
  dispatchEvent(type: "connect", event: ConnectEvent): void;
  dispatchEvent(type: "message", event: MessageEvent): void;
  removeEventListener(type: "connect", callback: ConnectSubscriber): void;
  removeEventListener(type: "message", callback: MessageSubscriber): void;
};

const createMessageTarget = (): MessageTargetLike => {
  const callbackMap = new Map<string, Function[]>();
  const getCallbacks = (type: string) => callbackMap.get(type) ?? [];

  return {
    addEventListener(type, callback) {
      callbackMap.set(type, [...getCallbacks(type), callback]);
    },
    dispatchEvent(type, event) {
      getCallbacks(type).forEach((callback) => callback(event));
    },
    removeEventListener(type, callback) {
      callbackMap.set(
        type,
        getCallbacks(type).filter((cb) => cb !== callback)
      );
    },
  };
};

const virtualMessageTarget = createMessageTarget();

export function virtualConnection(): MessagePortLike {
  const [port1, port2] = createMessageChannel();
  virtualMessageTarget.dispatchEvent("connect", { port: port2 });
  return port1;
}

export function virtualContext({
  createConnection = ({ delegate }) => delegate(),
}: {
  createConnection?: CreateVirtualConnection;
} = {}): MessagingContext {
  return (setPort) => {
    virtualMessageTarget.addEventListener("connect", ({ port }) => {
      const portLike = createConnection({
        delegate: () => port,
        port,
      });

      portLike && setPort(portLike);
    });
  };
}
