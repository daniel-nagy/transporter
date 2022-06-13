/// <reference lib="dom" />

import { Client, createClient, SessionManager, SessionPort } from ".";
import {
  createConnection,
  createPort,
  listenForConnection,
  MessageEvent,
} from "./connect";
import { fromEvent, merge, Observable, Subject } from "./Observable";

declare global {
  interface Window {
    ReactNativeWebView?: ReactNativeWebView;
  }
}

type ConnectProxy = (connection: {
  delegate(): SessionPort;
  port: SessionPort;
}) => SessionPort | null;

type ReactNativeWebView = {
  postMessage(message: string): void;
};

// React Native WebView will send and receive messages from the document on
// Android.
const globalProxy = merge(
  fromEvent<MessageEvent>(self, "message"),
  fromEvent<MessageEvent>(document, "message")
);

export function createSession(
  optionsOrWebView:
    | { timeout?: number; webView?: ReactNativeWebView }
    | ReactNativeWebView = {}
): Client {
  const { timeout = undefined, webView = self.ReactNativeWebView } =
    "postMessage" in optionsOrWebView
      ? { webView: optionsOrWebView }
      : optionsOrWebView;

  return createClient({
    port: createConnection({
      internal: globalProxy,
      external: proxyWebView(webView),
      scope: "react_native",
    }),
    timeout,
  });
}

export function createSessionManager({
  connect: connectProxy = ({ delegate }) => delegate(),
  webView = self.ReactNativeWebView,
}: {
  connect?: ConnectProxy;
  webView?: ReactNativeWebView;
} = {}): SessionManager {
  if (!webView)
    return { connect: new Observable((observer) => observer.complete()) };

  return {
    connect: listenForConnection({
      onConnect() {
        const port = createPort(globalProxy, proxyWebView(webView));
        return connectProxy({ delegate: () => port, port });
      },
      scope: "react_native_webview",
      target: globalProxy,
    }),
  };
}

function proxyWebView(webView?: ReactNativeWebView) {
  const webViewProxy = new Subject<string>();
  webViewProxy.subscribe((message) => webView?.postMessage(message));
  return webViewProxy;
}
