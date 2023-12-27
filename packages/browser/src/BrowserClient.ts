import * as Observable from "@daniel-nagy/transporter/Observable/index.js";

import * as Request from "./BrowserRequest.js";
import * as Response from "./BrowserResponse.js";
import * as StructuredCloneable from "./StructuredCloneable.js";

export { BrowserClient as t };

export type Options = {
  /**
   * The address of the server. The default is the empty string.
   */
  address?: string;
  /**
   * When connecting to a `Window` you may specify the allowed origin. If the
   * window and the origin do not match the connection will fail. The origin is
   * passed directly to the `targetOrigin` parameter of `postMessage` when
   * connecting to the window. The default is `"*"`, which allows any origin.
   */
  origin?: string;
};

export class BrowserClient {
  /**
   * The address of the server. An address is like a port number, except an
   * address can be any string instead of a meaningless number.
   */
  public readonly serverAddress: string;

  /**
   * If the window and the origin do not match the connection will fail. The
   * origin is only relevant when connecting to a window since the browser
   * will require worker URLs to be same-origin.
   */
  public readonly origin: string;

  /**
   * The message target. A message target is like a server host.
   */
  public readonly target: Window | Worker | SharedWorker | ServiceWorker;

  constructor({
    address = "",
    origin = "*",
    target
  }: {
    address?: string;
    origin?: string;
    target: Window | Worker | SharedWorker | ServiceWorker;
  }) {
    this.serverAddress = address;
    this.origin = origin;
    this.target = target;
  }

  /**
   * Makes a request to the server. Returns a promise that resolves with the
   * response from the server.
   */
  async fetch(body: StructuredCloneable.t): Promise<StructuredCloneable.t> {
    const messageSink = getMessageSink(this.target);
    const messageSource = getMessageSource(this.target);
    const request = Request.t({ address: this.serverAddress, body });

    const response = Observable.fromEvent<MessageEvent>(
      messageSource,
      "message"
    ).pipe(
      Observable.filter(
        (message): message is MessageEvent<Response.t> =>
          Response.isResponse(message) && message.data.id === request.id
      ),
      Observable.map((message) => message.data.body)
    );

    // Not sure it this is necessary or useful.
    if (this.target instanceof ServiceWorker)
      await navigator.serviceWorker.ready;

    messageSink.postMessage(request, { targetOrigin: this.origin });

    return Observable.firstValueFrom(response);
  }
}

/**
 * Creates a new `BrowserClient`.
 *
 * @example
 *
 * const worker = new Worker("/worker.js", { type: "module" });
 * const client = BrowserClient.from(worker);
 *
 * const response = await client.fetch("👋");
 */
export function from(
  target: Window | Worker | SharedWorker | ServiceWorker,
  options: Options = {}
) {
  if (target instanceof SharedWorker) target.port.start();
  return new BrowserClient({ ...options, target });
}

function getMessageSink(
  target: Window | Worker | SharedWorker | ServiceWorker
) {
  switch (true) {
    case target instanceof SharedWorker:
      return target.port;
    default:
      return target;
  }
}

function getMessageSource(
  target: Window | Worker | SharedWorker | ServiceWorker
) {
  switch (true) {
    case target instanceof ServiceWorker:
      return navigator.serviceWorker;
    case target instanceof SharedWorker:
      return target.port;
    case target instanceof Worker:
      return target;
    default:
      return self;
  }
}
