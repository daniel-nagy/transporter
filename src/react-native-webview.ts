/// <reference lib="dom" />

import { MessageEvent, MessageGateway, MessagePortLike } from ".";
import { createConnection, listenForConnection } from "./connect";
import {
  createEventTarget,
  createMessagePort,
  EventTargetLike,
} from "./messaging";

declare global {
  interface Window {
    ReactNativeWebView?: ReactNativeWebView;
  }
}

type ConnectProxy = (connection: {
  delegate(): MessagePortLike;
  port: MessagePortLike;
}) => MessagePortLike | null;

type ReactNativeWebView = {
  postMessage(message: string): void;
};

export function createChannel(
  webView: ReactNativeWebView | undefined = self.ReactNativeWebView
) {
  const globalProxy = createEventTarget();

  Array.of<EventTargetLike>(self, document).forEach((target) =>
    target.addEventListener<MessageEvent>("message", (event) => {
      globalProxy.dispatchEvent(
        new MessageEvent("message", { data: event.data })
      );
    })
  );

  return createConnection({
    internal: globalProxy,
    external: proxyWebView(webView),
    scope: "react_native",
  });
}

export function webViewGateway({
  connect = ({ delegate }) => delegate(),
  webView = self.ReactNativeWebView,
}: {
  connect?: ConnectProxy;
  webView?: ReactNativeWebView;
} = {}): MessageGateway {
  if (!webView) return () => {};

  const webViewProxy = createEventTarget();

  webViewProxy.addEventListener<MessageEvent>("message", (event) =>
    webView.postMessage(event.data)
  );

  return (onConnect) => {
    // React Native WebView will send and receive messages from the document on
    // Android.
    Array.of<EventTargetLike>(self, document).forEach((target) =>
      listenForConnection({
        onConnect(event) {
          const port = createMessagePort({
            internal: target,
            external: webViewProxy,
            portId: event.data.portId,
          });

          const portLike = connect({ delegate: () => port, port });
          portLike && onConnect(portLike);
          return portLike;
        },
        scope: "react_native_webview",
        target,
      })
    );
  };
}

function proxyWebView(webView?: ReactNativeWebView) {
  const webViewProxy = createEventTarget();

  webViewProxy.addEventListener<MessageEvent>("message", ({ data }) =>
    webView?.postMessage(data)
  );

  return webViewProxy;
}
