import { Client, createClient, SessionManager, SessionPort } from ".";
import {
  createConnection,
  createPort,
  listenForConnection,
  MessageEvent,
} from "./connect";
import { Subject } from "./Observable";

interface ConnectEvent extends MessageEvent {
  readonly source: ReactNativeWebView;
}

type ConnectProxy = (connection: {
  delegate(): SessionPort;
  port: SessionPort;
}) => SessionPort | null;

type ReactNativeWebView = {
  postMessage(message: string): void;
};

type WebViewMessageEvent = {
  nativeEvent: MessageEvent;
};

const nativeMessageTarget = new Subject<MessageEvent>();

export function createSession(
  optionsOrWebView:
    | { timeout?: number; webView: ReactNativeWebView }
    | ReactNativeWebView
): Client {
  const { timeout = undefined, webView } =
    "postMessage" in optionsOrWebView
      ? { webView: optionsOrWebView }
      : optionsOrWebView;

  return createClient({
    port: createConnection({
      internal: nativeMessageTarget.asObservable(),
      external: proxyWebView(webView),
      scope: "react_native_webview",
    }),
    timeout,
  });
}

export function createSessionManager({
  connect: connectProxy = ({ delegate }) => delegate(),
}: {
  connect?: ConnectProxy;
} = {}): SessionManager {
  return {
    connect: listenForConnection({
      onConnect(event: ConnectEvent) {
        const port = createPort(
          nativeMessageTarget,
          proxyWebView(event.source)
        );
        return connectProxy({ delegate: () => port, port });
      },
      scope: "react_native",
      target: nativeMessageTarget.asObservable(),
    }),
  };
}

export function dispatchMessage({
  event,
  source,
}: {
  event: WebViewMessageEvent;
  source: ReactNativeWebView;
}) {
  nativeMessageTarget.next({
    data: event.nativeEvent.data,
    source,
    type: "message",
  });
}

function proxyWebView(webView: ReactNativeWebView): Subject<string> {
  const webViewProxy = new Subject<string>();
  webViewProxy.subscribe((message) => webView.postMessage(message));
  return webViewProxy;
}
