import * as JsObject from "@daniel-nagy/transporter/JsObject";

import * as StructuredCloneable from "./StructuredCloneable.js";

export { Request as t };

const Type = "Request";

export type Request = {
  address: string;
  /**
   * Contains the value sent by the client.
   */
  body: StructuredCloneable.t;
  id: string;
  /**
   * The origin of the client making the request.
   */
  origin: string;
  type: typeof Type;
};

/**
 * A `Request` is created when a client makes a fetch request.
 */
export const Request = ({
  address,
  body
}: {
  address: string;
  body: StructuredCloneable.t;
}): Request => ({
  address,
  body,
  id: crypto.randomUUID(),
  origin: "", // Will be set securely on the server using `MessageEvent.origin`.
  type: Type
});

/**
 * Returns `true` if the message contains a request object.
 */
export function isRequest(event: MessageEvent): event is MessageEvent<Request> {
  return (
    JsObject.isObject(event.data) &&
    JsObject.has(event.data, "type") &&
    event.data.type === Type
  );
}
