import * as JsFunction from "./JsFunction.js";
import * as JsObject from "./JsObject.js";
import * as PubSub from "./PubSub.js";

export type { Proxy as t };

export const symbol = Symbol.for("proxy");

/**
 * A container for a proxied object.
 */
export type Proxy<T extends object> = JsObject.ReadonlyDeep<
  JsObject.PickDeep<T, JsFunction.t | PubSub.t>
>;

/**
 * Returns a new object that will be proxied instead of cloned by Transporter.
 */
export function from<T extends object>(value: T): Proxy<T> {
  return new Proxy(value, {
    get(target, prop, receiver) {
      if (prop === symbol) return true;
      return Reflect.get(target, prop, receiver);
    },
    getOwnPropertyDescriptor(target, prop) {
      if (prop === symbol) return { configurable: true };
      return Reflect.getOwnPropertyDescriptor(target, prop);
    },
    has(target, prop) {
      if (prop === symbol) return true;
      return Reflect.has(target, prop);
    }
  }) as Proxy<T>;
}

/**
 * Returns `true` if the value is proxy container.
 */
export function isProxy<T extends object, U>(
  value: Proxy<T> | U
): value is Proxy<T> {
  return JsObject.isObject(value) && JsObject.has(value, symbol);
}
