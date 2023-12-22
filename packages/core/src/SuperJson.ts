import * as JsObject from "./JsObject.js";
import * as Json from "./Json.js";

/**
 * An extended JSON type that includes many builtin JavaScript types.
 */
export type SuperJson =
  | void
  | null
  | undefined
  | boolean
  | number
  | bigint
  | string
  | Date
  | RegExp
  | Array<SuperJson>
  | Map<SuperJson, SuperJson>
  | Set<SuperJson>
  | { [key: string]: SuperJson };

export type { SuperJson as t };

/**
 * Encodes a SuperJson value as a valid JSON value.
 */
export function toJson(value: SuperJson): Json.t {
  switch (true) {
    case typeof value === "bigint":
      return EncodedBigInt(value);
    case typeof value === "undefined":
      return EncodedUndefined();
    case value instanceof Date:
      return EncodedDate(value);
    case value instanceof Map:
      return EncodedMap(value);
    case value instanceof RegExp:
      return EncodedRegExp(value);
    case value instanceof Set:
      return EncodedSet(value);
    case JsObject.isObject(value):
      return JsObject.mapValues(value, (_, item) => toJson(item));
    default:
      return value;
  }
}

/**
 * Revives an encoded SuperJson value from a JSON value.
 */
export function fromJson(value: Json.t): SuperJson {
  switch (true) {
    case isType(value, Type.BigInt):
      return BigInt(value.value);
    case isType(value, Type.Date):
      return new Date(value.value);
    case isType(value, Type.Map):
      return new Map(
        value.entries.map(([key, value]) => [fromJson(key), fromJson(value)])
      );
    case isType(value, Type.RegExp):
      return new RegExp(value.value, value.modifiers);
    case isType(value, Type.Set):
      return new Set(value.entries.map(fromJson));
    case isType(value, Type.Undefined):
      return;
    case JsObject.isObject(value):
      return JsObject.mapValues(value, (_, item) => fromJson(item));
    default:
      return value;
  }
}

enum Type {
  BigInt = "BigInt",
  Date = "Date",
  Map = "Map",
  RegExp = "RegExp",
  Set = "Set",
  Undefined = "Undefined"
}

type EncodedBigInt = {
  _type: Type.BigInt;
  value: string;
};

const EncodedBigInt = (value: bigint): EncodedBigInt => ({
  _type: Type.BigInt,
  value: value.toString()
});

type EncodedDate = {
  _type: Type.Date;
  value: number;
};

const EncodedDate = (date: Date): EncodedDate => ({
  _type: Type.Date,
  value: date.valueOf()
});

type EncodedMap = {
  _type: Type.Map;
  entries: [Json.t, Json.t][];
};

const EncodedMap = (value: Map<SuperJson, SuperJson>): EncodedMap => ({
  _type: Type.Map,
  entries: Array.from(value.entries()).map(([key, value]) => [
    toJson(key),
    toJson(value)
  ])
});

type EncodedRegExp = {
  _type: Type.RegExp;
  modifiers: string;
  value: string;
};

const EncodedRegExp = (value: RegExp): EncodedRegExp => {
  const asString = value.toString();
  const lastSlash = asString.lastIndexOf("/");

  return {
    _type: Type.RegExp,
    modifiers: asString.slice(lastSlash + 1),
    value: asString.slice(1, lastSlash)
  };
};

type EncodedSet = {
  _type: Type.Set;
  entries: Json.t[];
};

const EncodedSet = (value: Set<SuperJson>): EncodedSet => ({
  _type: Type.Set,
  entries: Array.from(value).map(toJson)
});

type EncodedUndefined = {
  _type: Type.Undefined;
};

const EncodedUndefined = (): EncodedUndefined => ({
  _type: Type.Undefined
});

const isType = <T extends Type>(
  value: unknown,
  type: T
): value is {
  BigInt: EncodedBigInt;
  Date: EncodedDate;
  Map: EncodedMap;
  RegExp: EncodedRegExp;
  Set: EncodedSet;
  Undefined: EncodedUndefined;
}[T] => {
  return (
    JsObject.isObject(value) &&
    JsObject.has(value, "_type") &&
    value._type === type
  );
};
