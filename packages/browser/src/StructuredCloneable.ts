/**
 * A `TypedArray` object describes an array-like view of an underlying binary
 * data buffer.
 */
export type TypedArray =
  | BigInt64Array
  | BigUint64Array
  | Float32Array
  | Float64Array
  | Int8Array
  | Int16Array
  | Int32Array
  | Uint8Array
  | Uint8ClampedArray
  | Uint16Array
  | Uint32Array;

/**
 * A value that can be cloned using the structured clone algorithm.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/structuredClone
 */
export type StructuredCloneable =
  | void
  | null
  | undefined
  | boolean
  | number
  | bigint
  | string
  | Date
  | ArrayBuffer
  | RegExp
  | TypedArray
  | Array<StructuredCloneable>
  | Map<StructuredCloneable, StructuredCloneable>
  | Set<StructuredCloneable>
  | { [key: string]: StructuredCloneable };

export type { StructuredCloneable as t };
