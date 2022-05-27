import { MessageEvent, MessageGateway, MessagePortLike } from ".";
import { createEventTarget, createMessagePort } from "./messaging";
import { ConnectEvent, createConnection, listenForConnection } from "./connect";

interface NativeConnectEvent extends ConnectEvent {
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

export function createChannel(webView: ReactNativeWebView) {
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
      onConnect(event: NativeConnectEvent) {
        const port = createMessagePort({
          internal: nativeMessageTarget,
          external: proxyWebView(event.source),
          portId: event.data.portId,
        });

        const portLike = connect({ delegate: () => port, port });
        portLike && onConnect(portLike);
        return portLike;
      },
      scope: "react_native",
      target: nativeMessageTarget,
    });
}

function proxyWebView(webView: ReactNativeWebView) {
  const webViewProxy = createEventTarget();

  webViewProxy.addEventListener<MessageEvent>("message", ({ data }) =>
    webView.postMessage(data)
  );

  return webViewProxy;
}
