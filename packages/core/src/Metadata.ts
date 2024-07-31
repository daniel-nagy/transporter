import * as JsObject from "./JsObject.js";

export type { Metadata as t };

export const symbol = Symbol.for("metadata");

/**
 * Metadata for a proxy.
 */
export type Metadata = {
  /**
   * The id of the client agent managing this proxy.
   */
  clientAgentId: string;
  /**
   * The path to the value in the original object from the dereferenced value.
   */
  objectPath: string[];
};

/**
 * Returns metadata for a proxy.
 */
export function get<Proxy extends object>(proxy: Proxy): Metadata | null {
  return JsObject.has(proxy, symbol) ? (proxy[symbol] as Metadata) : null;
}
