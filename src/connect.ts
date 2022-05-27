import { MessageEvent, MessagePortLike } from ".";
import { createMessagePort, EventTargetLike } from "./messaging";
import { safeParse } from "./json";
import { isObject } from "./object";
import { Queue } from "./Queue";
import { generateId } from "./uuid";

const MESSAGE_SOURCE = "transporter::connect";

export interface ConnectEvent {
  readonly data: {
    readonly portId: string;
  };
}

enum MessageType {
  ConnectionCreated = "connection_created",
  CreateConnection = "create_connection",
}

type ConnectionCreatedMessage = {
  readonly scope: string;
  readonly source: typeof MESSAGE_SOURCE;
  readonly type: MessageType.ConnectionCreated;
};

type CreateConnectionMessage = {
  readonly portId: string;
  readonly scope: string;
  readonly source: typeof MESSAGE_SOURCE;
  readonly type: MessageType.CreateConnection;
};

type Message = ConnectionCreatedMessage | CreateConnectionMessage;

export function createConnection({
  external,
  internal,
  scope,
}: {
  external: EventTargetLike;
  internal: EventTargetLike;
  scope: string;
}): MessagePortLike {
  const portId = generateId();

  const message: CreateConnectionMessage = {
    portId,
    scope,
    source: MESSAGE_SOURCE,
    type: MessageType.CreateConnection,
  };

  external.dispatchEvent({ data: JSON.stringify(message), type: "message" });

  const port = createMessagePort({ external, internal, portId });
  const { postMessage } = port;

  let connected = false;
  let messageQueue: Queue<string> | null = new Queue<string>();

  Object.defineProperty(port, "postMessage", {
    value: (message: string) =>
      connected ? postMessage.call(port, message) : messageQueue?.push(message),
  });

  port.addEventListener("message", function onMessage(event) {
    if (!isConnectionCreatedMessage(safeParse(event.data), scope)) return;
    port.removeEventListener("message", onMessage);
    connected = true;
    messageQueue?.drain((message) => port.postMessage(message));
    messageQueue = null;
  });

  return port;
}

export function listenForConnection<E extends ConnectEvent>({
  onConnect,
  scope,
  target,
}: {
  onConnect(event: E): MessagePortLike | null;
  scope: string;
  target: EventTargetLike;
}): void {
  target.addEventListener<MessageEvent>("message", function onMessage(event) {
    const data = safeParse(event.data);
    if (!isCreateConnectionMessage(data, scope)) return;

    const port = onConnect({ ...event, data } as unknown as E);
    if (!port) return;

    const message: ConnectionCreatedMessage = {
      scope,
      source: MESSAGE_SOURCE,
      type: MessageType.ConnectionCreated,
    };

    port.postMessage(JSON.stringify(message));
  });
}

function isMessage(message: unknown, scope: string): message is Message {
  return (
    isObject(message) &&
    message.source === MESSAGE_SOURCE &&
    message.scope === scope
  );
}

function isConnectionCreatedMessage(
  message: unknown,
  scope: string
): message is ConnectionCreatedMessage {
  return (
    isMessage(message, scope) && message.type === MessageType.ConnectionCreated
  );
}

function isCreateConnectionMessage(
  message: unknown,
  scope: string
): message is CreateConnectionMessage {
  return (
    isMessage(message, scope) && message.type === MessageType.CreateConnection
  );
}
