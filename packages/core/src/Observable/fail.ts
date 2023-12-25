import { isFunction } from "../JsFunction.js";
import { Observable } from "./Observable.js";

/**
 * Creates an observable that will immediately error with the provided value.
 * If the value is a function then the function will be called to get the value.
 */
export function fail<E>(errorOrCallback: E | (() => E)) {
  return new Observable<never>((observer) => {
    observer.error?.(
      isFunction(errorOrCallback) ? errorOrCallback() : errorOrCallback
    );
  });
}
