import {
  createMessagePort,
  EventTargetLike,
  filterEvent,
  forwardEvent,
  mapEvent,
  MessageEvent,
  MessagePortLike,
  proxy,
  proxyEvent,
} from "./messaging";
import { safeParse } from "./json";
import { isObject } from "./object";
import { Queue } from "./Queue";
import { generateId } from "./uuid";

const MESSAGE_SOURCE = "transporter::connect";

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

  const port = connect({ external, internal, portId });

  let connected = false;
  let messageQueue: Queue<string> | null = new Queue<string>();

  port.addEventListener("message", function onMessage(event) {
    if (!isConnectionCreatedMessage(safeParse(event.data), scope)) return;
    port.removeEventListener("message", onMessage);
    connected = true;
    messageQueue?.drain((message) => port.postMessage(message));
    messageQueue = null;
  });

  return proxy(port, {
    postMessage: (port, message) =>
      connected ? port.postMessage(message) : messageQueue?.push(message),
  });
}

export function listenForConnection<E extends MessageEvent>({
  onConnect,
  scope,
  target,
}: {
  onConnect(
    event: E,
    createPort: (link: EventTargetLike) => MessagePortLike
  ): void;
  scope: string;
  target: EventTargetLike;
}): void {
  target.addEventListener("message", function onMessage(event) {
    const data = safeParse(event.data);
    if (!isCreateConnectionMessage(data, scope)) return;

    onConnect(event as E, (link: EventTargetLike) => {
      const port = connect({
        external: link,
        internal: target,
        portId: data.portId,
      });

      const message: ConnectionCreatedMessage = {
        scope,
        source: MESSAGE_SOURCE,
        type: MessageType.ConnectionCreated,
      };

      port.postMessage(JSON.stringify(message));

      return port;
    });
  });
}

function connect({
  external,
  internal,
  portId,
}: {
  external: EventTargetLike;
  internal: EventTargetLike;
  portId: string;
}): MessagePortLike {
  const port = createMessagePort(
    proxyEvent("message", external, wrapMessage(portId))
  );

  Array.of(internal)
    .map((target) => filterEvent("message", target, isMessageProxy(portId)))
    .map((target) => mapEvent("message", target, unwrapMessage))
    .map((target) => forwardEvent("message", target, port));

  return port;
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

function isMessage(message: unknown, scope: string): message is Message {
  return (
    isObject(message) &&
    message.source === MESSAGE_SOURCE &&
    message.scope === scope
  );
}

function isMessageProxy(portId: string) {
  return (event: MessageEvent) => {
    const message = safeParse(event.data);
    return isObject(message) && message.portId === portId;
  };
}

function unwrapMessage(event: MessageEvent) {
  return { type: "message", data: JSON.parse(event.data).message };
}

function wrapMessage(portId: string) {
  return (event: MessageEvent) => ({
    ...event,
    data: JSON.stringify({ message: event.data, portId }),
  });
}
