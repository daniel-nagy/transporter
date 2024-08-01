import { expect, test } from "bun:test";

import * as UUID from "./UUID.js";

test("generating a v4 UUID", () => {
  expect(UUID.v4()).toEqual(
    expect.stringMatching(/\w{8}-\w{4}-\w{4}-\w{4}-\w{12}/)
  );
});
