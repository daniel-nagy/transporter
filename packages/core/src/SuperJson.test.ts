import { expect, test } from "bun:test";

import * as SuperJson from "./SuperJson.js";

test("serializing and deserializing bigint", () => {
  expect(serializeAndDeserialize(1n)).toBe(1n);
});

test("serializing and deserializing Date", () => {
  const now = Date.now();
  expect(serializeAndDeserialize(new Date(now))).toEqual(new Date(now));
});

test("serializing and deserializing Map", () => {
  expect(serializeAndDeserialize(new Map([["ok", "👌"]]))).toEqual(
    new Map([["ok", "👌"]])
  );
});

test("serializing and deserializing RegExp", () => {
  expect(serializeAndDeserialize(/👌/)).toEqual(/👌/);
});

test("serializing and deserializing Set", () => {
  expect(serializeAndDeserialize(new Set(["👌"]))).toEqual(new Set(["👌"]));
});

test("serializing and deserializing undefined", () => {
  expect(serializeAndDeserialize(undefined)).toBe(undefined);
});

function serializeAndDeserialize(value: SuperJson.t) {
  return SuperJson.fromJson(
    JSON.parse(JSON.stringify(SuperJson.toJson(value)))
  );
}
