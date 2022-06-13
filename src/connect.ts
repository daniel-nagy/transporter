import { SessionPort } from ".";
import type { Event } from "./event-target";
import { JSON, safeParse } from "./json";
import { isObject } from "./object";
import { filter, map, ObservableLike, Subject, take, tap } from "./Observable";
import { Queue } from "./Queue";
import { Sequence } from "./Sequence";
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

export interface MessageEvent<T = any> extends Event {
  data: T;
}

export function createConnection({
  external,
  internal,
  scope,
}: {
  external: Subject<string>;
  internal: ObservableLike<MessageEvent>;
  scope: string;
}): SessionPort {
  const portId = generateId();

  const message: CreateConnectionMessage = {
    portId,
    scope,
    source: MESSAGE_SOURCE,
    type: MessageType.CreateConnection,
  };

  external.next(JSON.stringify(message));

  let connected = false;
  let messageQueue: Queue<string> | null = new Queue<string>();

  return Sequence.of(createPort(internal, external))
    .pipe(proxyPort(portId))
    .tap((port) =>
      Sequence.of(port.receive)
        .pipe((observable) => map(observable, safeParse))
        .pipe((observable) =>
          filter(observable, isConnectionCreatedMessage(scope))
        )
        .pipe((observable) => take(observable, 1))
        .fold()
        .subscribe(() => {
          connected = true;
          messageQueue?.drain((message) => port.send(message));
          messageQueue = null;
        })
    )
    .pipe((port) => ({
      ...port,
      send: (message: string) =>
        connected ? port.send(message) : messageQueue?.push(message),
    }))
    .fold();
}

export function listenForConnection<E extends MessageEvent>({
  onConnect,
  scope,
  target,
}: {
  onConnect(event: E): SessionPort | null;
  scope: string;
  target: ObservableLike<MessageEvent>;
}): ObservableLike<SessionPort> {
  return Sequence.of(target)
    .pipe((observable) => map(observable, safeParseEventData))
    .pipe((observable) => filter(observable, isCreateConnectionEvent<E>(scope)))
    .pipe((observable) =>
      map(observable, (event) => {
        const port = onConnect(event);
        return port && proxyPort(event.data.portId)(port);
      })
    )
    .pipe((observable) =>
      filter(observable, (port): port is SessionPort => Boolean(port))
    )
    .pipe((observable) =>
      tap(observable, (port) => {
        const message: ConnectionCreatedMessage = {
          scope,
          source: MESSAGE_SOURCE,
          type: MessageType.ConnectionCreated,
        };

        port.send(JSON.stringify(message));
      })
    )
    .fold();
}

export function createPort(
  receiveFrom: ObservableLike<MessageEvent>,
  sendTo: Subject<string>
): SessionPort {
  return {
    receive: map(receiveFrom, (event) => event.data),
    send: (message) => sendTo.next(message),
  };
}

function proxyPort(portId: string) {
  type MessageProxy = { message: string; portId: string };

  const isMessageProxy =
    (portId: string) =>
    (message: JSON): message is MessageProxy =>
      isObject(message) && message.portId === portId;

  return (port: SessionPort): SessionPort => ({
    receive: Sequence.of(port.receive)
      .pipe((observable) => map(observable, safeParse))
      .pipe((observable) => filter(observable, isMessageProxy(portId)))
      .pipe((observable) => map(observable, ({ message }) => message))
      .fold(),
    send: (message: string) => port.send(JSON.stringify({ message, portId })),
  });
}

function isConnectionCreatedMessage(scope: string) {
  return (message: unknown): message is ConnectionCreatedMessage =>
    isMessage(message, scope) && message.type === MessageType.ConnectionCreated;
}

function isCreateConnectionEvent<E extends MessageEvent>(scope: string) {
  return (
    event: MessageEvent<JSON>
  ): event is MessageEvent<CreateConnectionMessage> & E =>
    isCreateConnectionMessage(scope)(event.data);
}

function isCreateConnectionMessage(scope: string) {
  return (message: unknown): message is CreateConnectionMessage =>
    isMessage(message, scope) && message.type === MessageType.CreateConnection;
}

function isMessage(message: unknown, scope: string): message is Message {
  return (
    isObject(message) &&
    message.source === MESSAGE_SOURCE &&
    message.scope === scope
  );
}

function safeParseEventData(event: MessageEvent): MessageEvent<JSON> {
  return { ...event, data: safeParse(event.data) };
}
