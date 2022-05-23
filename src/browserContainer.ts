/// <reference lib="dom" />

import { MessagePortLike, ModuleContainer } from ".";
import { safeParse } from "./json";
import { isObject } from "./object";
import { Queue } from "./Queue";

const MESSAGE_SOURCE = "transporter::browser_container";

type CreateBrowserConnection = (context: {
  delegate(): MessagePortLike;
  origin: string;
  port: MessagePort;
}) => MessagePortLike | null;

enum MessageType {
  ConnectionCreated = "connection_created",
  CreateConnection = "create_connection",
}

type ConnectionCreatedMessage = {
  readonly source: typeof MESSAGE_SOURCE;
  readonly type: MessageType.ConnectionCreated;
};

type CreateConnectionMessage = {
  readonly source: typeof MESSAGE_SOURCE;
  readonly type: MessageType.CreateConnection;
};

type Message = ConnectionCreatedMessage | CreateConnectionMessage;

export function browserConnection(
  optionsOrWindow: { origin?: string; window: Window } | Window
): MessagePortLike {
  const { origin = "*", window } =
    optionsOrWindow instanceof Window
      ? { window: optionsOrWindow }
      : optionsOrWindow;

  const channel = new MessageChannel();

  const message: CreateConnectionMessage = {
    source: MESSAGE_SOURCE,
    type: MessageType.CreateConnection,
  };

  window.postMessage(JSON.stringify(message), origin, [channel.port2]);

  let connected = false;
  let messageQueue: Queue<string> | null = new Queue<string>();

  channel.port1.start();
  channel.port1.addEventListener("message", (event) => {
    if (isConnectionCreatedMessage(safeParse(event.data))) {
      connected = true;
      messageQueue?.drain((message) => channel.port1.postMessage(message));
      messageQueue = null;
    }
  });

  const { postMessage } = channel.port1;

  return Object.defineProperty(channel.port1, "postMessage", {
    value: (message: string) =>
      connected
        ? postMessage.call(channel.port1, message)
        : messageQueue?.push(message),
  });
}

export function browserContainer({
  createConnection = ({ delegate }) => delegate(),
  window = self,
}: {
  createConnection?: CreateBrowserConnection;
  window?: Window;
} = {}): ModuleContainer {
  return (setPort) => {
    window.addEventListener("message", ({ data, origin, ports: [port] }) => {
      if (!isCreateConnectionMessage(safeParse(data))) return;

      const portLike = createConnection({
        delegate: () => {
          port.start();
          return port;
        },
        origin,
        port,
      });

      if (!portLike) return;

      const message: ConnectionCreatedMessage = {
        source: MESSAGE_SOURCE,
        type: MessageType.ConnectionCreated,
      };

      portLike?.postMessage(JSON.stringify(message));
      setPort(portLike);
    });
  };
}

export function isMessage(message: unknown): message is Message {
  return isObject(message) && message.source === MESSAGE_SOURCE;
}

export function isConnectionCreatedMessage(
  message: unknown
): message is ConnectionCreatedMessage {
  return isMessage(message) && message.type === MessageType.ConnectionCreated;
}

export function isCreateConnectionMessage(
  message: unknown
): message is CreateConnectionMessage {
  return isMessage(message) && message.type === MessageType.CreateConnection;
}
