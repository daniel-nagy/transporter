/// <reference lib="dom" />

import { Client, createClient, SessionManager, SessionPort } from ".";
import { safeParse } from "./json";
import { isObject } from "./object";
import { filter, fromEvent, map, tap, take } from "./Observable";
import { Queue } from "./Queue";
import { Sequence } from "./Sequence";

const MESSAGE_SOURCE = "transporter::browser";

export type ConnectProxy = (connection: {
  delegate(): SessionPort;
  origin: string;
  port: MessagePort;
}) => SessionPort | null;

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

export function createSession(
  optionsOrWindow:
    | { origin?: string; timeout?: number; window: Window }
    | Window
): Client {
  const {
    origin = "*",
    timeout = undefined,
    window,
  } = optionsOrWindow instanceof Window
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

  return Sequence.of(channel.port1)
    .pipe(fromPort)
    .tap((port) =>
      Sequence.of(port.receive)
        .pipe((observable) => map(observable, safeParse))
        .pipe((observable) => filter(observable, isConnectionCreatedMessage))
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
    .pipe((port) => createClient({ port, timeout }))
    .fold();
}

export function createSessionManager({
  connect = ({ delegate }) => delegate(),
  window = self,
}: {
  connect?: ConnectProxy;
  window?: Window;
} = {}): SessionManager {
  return {
    connect: Sequence.of(window)
      .pipe((window) => fromEvent<MessageEvent>(window, "message"))
      .pipe((observable) =>
        filter(observable, ({ data }) =>
          isCreateConnectionMessage(safeParse(data))
        )
      )
      .pipe((observable) =>
        map(observable, ({ origin, ports: [port] }) =>
          connect({ delegate: () => fromPort(port), origin, port })
        )
      )
      .pipe((observable) =>
        filter(observable, (port): port is SessionPort => Boolean(port))
      )
      .pipe((observable) =>
        tap(observable, (port) => {
          const message: ConnectionCreatedMessage = {
            source: MESSAGE_SOURCE,
            type: MessageType.ConnectionCreated,
          };

          port.send(JSON.stringify(message));
        })
      )
      .fold(),
  };
}

function fromPort(port: MessagePort): SessionPort {
  port.start();

  return {
    receive: Sequence.of(port)
      .pipe((port) => fromEvent<MessageEvent>(port, "message"))
      .pipe((observable) => map(observable, (event) => event.data))
      .fold(),
    send: (message: string) => port.postMessage(message),
  };
}

function isConnectionCreatedMessage(
  message: unknown
): message is ConnectionCreatedMessage {
  return isMessage(message) && message.type === MessageType.ConnectionCreated;
}

function isCreateConnectionMessage(
  message: unknown
): message is CreateConnectionMessage {
  return isMessage(message) && message.type === MessageType.CreateConnection;
}

function isMessage(message: unknown): message is Message {
  return isObject(message) && message.source === MESSAGE_SOURCE;
}
