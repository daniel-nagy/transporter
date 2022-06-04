import { MessageGateway } from ".";
import {
  createEventTarget,
  EventTargetLike,
  MessageEvent,
  MessagePortLike,
} from "./messaging";
import { createConnection, listenForConnection } from "./connect";

interface ConnectEvent extends MessageEvent {
  readonly source: ReactNativeWebView;
}

type ConnectProxy = (connection: {
  delegate(): MessagePortLike;
  port: MessagePortLike;
}) => MessagePortLike | null;

type ReactNativeWebView = {
  postMessage(message: string): void;
};

type WebViewMessageEvent = {
  nativeEvent: MessageEvent;
};

const nativeMessageTarget = createEventTarget();

export function createChannel(webView: ReactNativeWebView): MessagePortLike {
  return createConnection({
    internal: nativeMessageTarget,
    external: proxyWebView(webView),
    scope: "react_native_webview",
  });
}

export function dispatchMessage({
  event,
  source,
}: {
  event: WebViewMessageEvent;
  source: ReactNativeWebView;
}) {
  nativeMessageTarget.dispatchEvent({
    data: event.nativeEvent.data,
    source,
    type: "message",
  });
}

export function nativeGateway({
  connect = ({ delegate }) => delegate(),
}: {
  connect?: ConnectProxy;
} = {}): MessageGateway {
  return (onConnect) =>
    listenForConnection({
      onConnect(event: ConnectEvent, createPort) {
        const port = createPort(proxyWebView(event.source));
        const portLike = connect({ delegate: () => port, port });
        portLike && onConnect(portLike);
      },
      scope: "react_native",
      target: nativeMessageTarget,
    });
}

function proxyWebView(webView: ReactNativeWebView): EventTargetLike {
  const webViewProxy = createEventTarget();

  webViewProxy.addEventListener("message", ({ data }) =>
    webView.postMessage(data)
  );

  return webViewProxy;
}
