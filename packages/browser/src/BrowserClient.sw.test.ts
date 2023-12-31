import { assert } from "sinon";

import * as BrowserClient from "./BrowserClient.js";
import * as Test from "./Test.js";

const { test } = Test;

afterEach(async () => {
  await navigator.serviceWorker
    .getRegistrations()
    .then((registrations) =>
      Promise.all(registrations.map((r) => r.unregister()))
    );
});

test("a frame making a request to a service worker", async () => {
  await Test.createServiceWorker(/* ts */ `
    import * as BrowserServer from "http://localhost:8000/packages/browser/src/BrowserServer.ts";

    const server = BrowserServer.listen({
      handle(_request) {
        return "hi from the worker";
      }
    });
  `);

  const client = BrowserClient.from(BrowserClient.SW);
  const response = await client.fetch();

  assert.match(response, "hi from the worker");
});
