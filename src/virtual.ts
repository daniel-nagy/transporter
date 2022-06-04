import { MessageGateway } from ".";
import {
  createEventTarget,
  createMessageChannel,
  MessagePortLike,
} from "./messaging";

type ConnectProxy = (connection: {
  delegate(): MessagePortLike;
  port: MessagePortLike;
}) => MessagePortLike | null;

type ConnectEvent = {
  port: MessagePortLike;
  type: "connect";
};

const virtualMessageTarget = createEventTarget();

export function virtualChannel(): MessagePortLike {
  const [port1, port2] = createMessageChannel();

  virtualMessageTarget.dispatchEvent<ConnectEvent>({
    type: "connect",
    port: port2,
  });

  return port1;
}

export function virtualGateway({
  connect = ({ delegate }) => delegate(),
}: {
  connect?: ConnectProxy;
} = {}): MessageGateway {
  return (onConnect) => {
    virtualMessageTarget.addEventListener<ConnectEvent>(
      "connect",
      ({ port }) => {
        const portLike = connect({ delegate: () => port, port });
        portLike && onConnect(portLike);
      }
    );
  };
}
