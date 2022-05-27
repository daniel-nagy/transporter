import { MessageEvent } from ".";
import { createEventTarget } from "./messaging";
import { createConnection } from "./connect";

type ReactNativeWebView = {
  postMessage(message: string): void;
};

type WebViewMessageEvent = {
  nativeEvent: MessageEvent;
};

const nativeMessageTarget = createEventTarget();

export function createChannel(webView: ReactNativeWebView) {
  const webViewProxy = createEventTarget();

  webViewProxy.addEventListener<MessageEvent>("message", (event) =>
    webView.postMessage(event.data)
  );

  return createConnection({
    internal: nativeMessageTarget,
    external: webViewProxy,
    scope: "react_native_webview",
  });
}

export function dispatchMessage(event: WebViewMessageEvent) {
  nativeMessageTarget.dispatchEvent({
    type: "message",
    data: event.nativeEvent.data,
  });
}
