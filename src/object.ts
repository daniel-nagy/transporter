export type ObjectPath = string[];

export function getIn<T>(value: T, [prop, ...path]: ObjectPath): unknown {
  if (!prop) return value;
  if (isObject(value)) return getIn(value[prop], path);
  return undefined;
}

export function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

export function mapValues<T>(value: T, callback: (value: any) => any): any {
  if (Array.isArray(value))
    return callback(value.map((item) => mapValues(item, callback)));

  if (isObject(value))
    return callback(
      Object.entries(value).reduce(
        (acc, [key, value]) => ({
          ...acc,
          [key]: mapValues(value, callback),
        }),
        {}
      )
    );

  return callback(value);
}
