/// <reference lib="webworker" />

import { Client, createClient, SessionManager, SessionPort } from ".";
import { fromEvent, map, Observable } from "./Observable";
import { Sequence } from "./Sequence";

type ConnectProxy = (connection: {
  delegate(): SessionPort;
  port: SessionPort;
}) => SessionPort | null;

export function createSession(
  optionsOrWorker: { timeout?: number; worker: Worker } | Worker
): Client {
  const { timeout = undefined, worker } =
    optionsOrWorker instanceof Worker
      ? { worker: optionsOrWorker }
      : optionsOrWorker;

  return createClient({ port: fromWorker(worker), timeout });
}

export function createSessionManager({
  connect = ({ delegate }) => delegate(),
  worker = self as unknown as Worker,
}: {
  connect?: ConnectProxy;
  worker?: Worker;
} = {}): SessionManager {
  const port = fromWorker(worker);
  return {
    connect: Observable.of(connect({ delegate: () => port, port })),
  };
}

function fromWorker(worker: Worker): SessionPort {
  return {
    receive: Sequence.of(worker)
      .pipe((worker) => fromEvent<MessageEvent>(worker, "message"))
      .pipe((observable) => map(observable, (event) => event.data))
      .fold(),
    send: (message: string) => worker.postMessage(message),
  };
}
