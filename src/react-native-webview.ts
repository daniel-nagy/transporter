/// <reference lib="dom" />

import { MessageEvent, MessageGateway, MessagePortLike } from ".";
import { listenForConnection } from "./connect";
import { createEventTarget, EventTargetLike } from "./messaging";

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
        onConnect(port) {
          const portLike = connect({ delegate: () => port, port });
          portLike && onConnect(portLike);
          return portLike;
        },
        internal: target,
        external: webViewProxy,
        scope: "react_native_webview",
      })
    );
  };
}
