import { isFunction } from "../JsFunction.js";
import { Observable } from "./Observable.js";

/**
 * Creates an observable that will immediately error with the provided value.
 * If the value is a function then the function will be called to get the value.
 */
export function fail<T>(errorOrCallback: T | (() => T)) {
  return new Observable<never>((observer) => {
    observer.error?.(
      isFunction(errorOrCallback) ? errorOrCallback() : errorOrCallback
    );
  });
}
