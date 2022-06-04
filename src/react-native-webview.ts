/// <reference lib="dom" />

import { MessageGateway } from ".";
import { createConnection, listenForConnection } from "./connect";
import {
  createEventTarget,
  EventTargetLike,
  forwardEvent,
  MessagePortLike,
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

const globalProxy = createEventTarget();

// React Native WebView will send and receive messages from the document on
// Android.
Array.of<EventTargetLike>(self, document).forEach((target) =>
  forwardEvent("message", target, globalProxy)
);

export function createChannel(
  webView: ReactNativeWebView | undefined = self.ReactNativeWebView
) {
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

  return (onConnect) => {
    listenForConnection({
      onConnect(_event, createPort) {
        const port = createPort(proxyWebView(webView));
        const portLike = connect({ delegate: () => port, port });
        portLike && onConnect(portLike);
      },
      scope: "react_native_webview",
      target: globalProxy,
    });
  };
}

function proxyWebView(webView?: ReactNativeWebView) {
  const webViewProxy = createEventTarget();

  webViewProxy.addEventListener("message", ({ data }) =>
    webView?.postMessage(data)
  );

  return webViewProxy;
}
