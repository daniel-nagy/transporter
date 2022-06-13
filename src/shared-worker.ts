/// <reference lib="webworker" />

import { Client, createClient, SessionManager, SessionPort } from ".";
import { filter, fromEvent, map } from "./Observable";
import { Sequence } from "./Sequence";

type ConnectProxy = (connection: {
  delegate(): SessionPort;
  origin: string;
  port: MessagePort;
}) => SessionPort | null;

export function createSession(
  optionsOrWorker: { timeout?: number; worker: SharedWorker } | SharedWorker
): Client {
  const { timeout = undefined, worker } =
    optionsOrWorker instanceof SharedWorker
      ? { worker: optionsOrWorker }
      : optionsOrWorker;

  return createClient({ port: fromPort(worker.port), timeout });
}

export function createSessionManager({
  connect = ({ delegate }) => delegate(),
  worker = self as unknown as SharedWorkerGlobalScope,
}: {
  connect?: ConnectProxy;
  worker?: SharedWorkerGlobalScope;
} = {}): SessionManager {
  return {
    connect: Sequence.of(worker)
      .pipe((worker) => fromEvent<MessageEvent>(worker, "connect"))
      .pipe((observable) =>
        map(observable, ({ origin, ports: [port] }) =>
          connect({ delegate: () => fromPort(port), origin, port })
        )
      )
      .pipe((observable) =>
        filter(observable, (port): port is SessionPort => Boolean(port))
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
