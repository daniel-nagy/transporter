/// <reference lib="webworker" />

import { MessagePortLike, MessagingContext } from ".";

type CreateSharedWorkerConnection = (context: {
  delegate(): MessagePortLike;
  origin: string;
  port: MessagePort;
}) => MessagePortLike | null;

export function sharedWorkerConnection(worker: SharedWorker): MessagePort {
  worker.port.start();
  return worker.port;
}

export function sharedWorkerContext({
  createConnection = ({ delegate }) => delegate(),
  worker = self as unknown as SharedWorkerGlobalScope,
}: {
  createConnection?: CreateSharedWorkerConnection;
  worker?: SharedWorkerGlobalScope;
} = {}): MessagingContext {
  return (setPort) => {
    worker.addEventListener("connect", ({ origin, ports: [port] }) => {
      const portLike = createConnection({
        delegate() {
          port.start();
          return port;
        },
        origin,
        port,
      });

      portLike && setPort(portLike);
    });
  };
}
