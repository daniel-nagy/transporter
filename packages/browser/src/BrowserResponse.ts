import * as JsObject from "@daniel-nagy/transporter/JsObject.js";

import * as StructuredCloneable from "./StructuredCloneable.js";

export { Response as t };

const Type = "Response";

export type Response = {
  /**
   * The payload of the response. This is the value the client will receive.
   */
  body: StructuredCloneable.t;
  id: string;
  type: typeof Type;
};

/**
 * A `Response` is created from the value returned by the server's request
 * handler.
 */
export const Response = ({
  body,
  id
}: {
  body: StructuredCloneable.t;
  id: string;
}): Response => ({
  body,
  id,
  type: Type
});

/**
 * Returns `true` if the message contains a response object.
 */
export function isResponse(
  event: MessageEvent
): event is MessageEvent<Response> {
  return (
    JsObject.isObject(event.data) &&
    JsObject.has(event.data, "type") &&
    event.data.type === Type
  );
}
