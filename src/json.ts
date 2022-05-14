export type JSON = boolean | null | number | string | JSON[] | JSONObject;
export type JSONObject = { [key: string]: JSON };

export function safeParse(value: string): JSON {
  try {
    return JSON.parse(value);
  } catch (_exception) {
    return null;
  }
}
