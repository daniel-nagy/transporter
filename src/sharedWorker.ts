/// <reference lib="webworker" />

import { MessageGateway, MessagePortLike } from ".";

type ConnectProxy = (connection: {
  delegate(): MessagePortLike;
  origin: string;
  port: MessagePort;
}) => MessagePortLike | null;

export function sharedWorkerChannel(worker: SharedWorker): MessagePort {
  worker.port.start();
  return worker.port;
}

export function sharedWorkerGateway({
  connect = ({ delegate }) => delegate(),
  worker = self as unknown as SharedWorkerGlobalScope,
}: {
  connect?: ConnectProxy;
  worker?: SharedWorkerGlobalScope;
} = {}): MessageGateway {
  return (onConnect) => {
    worker.addEventListener("connect", ({ origin, ports: [port] }) => {
      const portLike = connect({
        delegate() {
          port.start();
          return port;
        },
        origin,
        port,
      });

      portLike && onConnect(portLike);
    });
  };
}
