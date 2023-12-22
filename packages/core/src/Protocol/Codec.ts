import * as JsFunction from "../JsFunction.js";
import * as JsObject from "../JsObject.js";
import * as Proxy from "../Proxy.js";

/**
 * Decodes the payload of a Transporter message. If a proxy is encountered while
 * mapping over the payload then a client agent is spawned to manage that
 * resource.
 */
export function decode(value: unknown, proxy: (address: string) => unknown) {
  const visit = (node: unknown): unknown => {
    switch (true) {
      case isEncodedProxy(node):
        return proxy(node.address);
      case isMap(node):
        return new Map(
          [...node.entries()].map(([key, item]) => [visit(key), visit(item)])
        );
      case Array.isArray(node):
      case isRecord(node):
        return JsObject.mapValues(node, (_, child) => visit(child));
      case isSet(node):
        return new Set([...node].map((item) => visit(item)));
      default:
        return node;
    }
  };

  return visit(value);
}

/**
 * Encodes the payload of a Transporter message. If a function or proxy is
 * encountered while mapping over the value a server agent is spawned to manage
 * that resource.
 */
export function encode(value: unknown, proxy: (value: unknown) => string) {
  const visit = (node: unknown): unknown => {
    switch (true) {
      case JsFunction.isFunction(node):
      case Proxy.isProxy(node):
        return EncodedProxy(proxy(node));
      case isMap(node):
        return new Map(
          [...node.entries()].map(([key, item]) => [visit(key), visit(item)])
        );
      case Array.isArray(node):
      case isRecord(node):
        return JsObject.mapValues(node, (_, child) => visit(child));
      case isSet(node):
        return new Set([...node].map((item) => visit(item)));
      default:
        return node;
    }
  };

  return visit(value);
}

enum Type {
  Proxy = "Proxy"
}

type EncodedProxy = {
  type: Type.Proxy;
  address: string;
};

/**
 * Encodes a proxy such that a client can discover the address of the proxy when
 * decoding a message.
 */
const EncodedProxy = (address: string): EncodedProxy => ({
  type: Type.Proxy,
  address
});

function isEncodedProxy(value: unknown): value is EncodedProxy {
  return (
    JsObject.isObject(value) &&
    JsObject.has(value, "type") &&
    value.type === Type.Proxy
  );
}

function isMap(value: unknown): value is Map<unknown, unknown> {
  return value instanceof Map;
}

function isRecord(value: unknown): value is Record<PropertyKey, unknown> {
  return JsObject.isObject(value) && value.constructor === Object;
}

function isSet(value: unknown): value is Set<unknown> {
  return value instanceof Set;
}
