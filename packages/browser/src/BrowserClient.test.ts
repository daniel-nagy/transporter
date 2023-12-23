import * as Observable from "@daniel-nagy/transporter/Observable";
import { assert } from "sinon";

import * as BrowserClient from "./BrowserClient.js";
import * as BrowserServer from "./BrowserServer.js";
import * as Test from "./Test.js";

const { test } = Test;

test("a child frame making a request to a parent frame", async () => {
  BrowserServer.listen({
    handle(_request) {
      return "hi from the parent";
    }
  });

  const srcDoc = /* html */ `
    <script type="module" data-transpile>
      import * as BrowserClient from "/packages/browser/src/BrowserClient.ts";
      const client = BrowserClient.from(self.parent);
      const response = await client.fetch();

      self.parent.postMessage(
        { type: "received", response },
        { targetOrigin: "*" }
      );
    </script>
  `;

  const messageStream = Observable.fromEvent<MessageEvent>(self, "message");
  await Test.createIframe(srcDoc);

  const response = await Observable.firstValueFrom(
    messageStream.pipe(
      Observable.filter((message) => message.data.type === "received")
    )
  );

  assert.match(response.data.response, "hi from the parent");
});

test("a parent frame making a request to a child frame", async () => {
  const srcDoc = /* html */ `
    <script type="module" data-transpile>
      import * as BrowserServer from "http://localhost:8000/packages/browser/src/BrowserServer.ts";

      const server = BrowserServer.listen({
        handle(_request) {
          return "hi from the child";
        }
      });
    </script>
  `;

  const frame = await Test.createIframe(srcDoc);
  const client = BrowserClient.from(frame.contentWindow);
  const response = await client.fetch();

  assert.match(response, "hi from the child");
});

test("a frame making a request to a dedicated worker", async () => {
  const worker = await Test.createWorker(/* ts */ `
    import * as BrowserServer from "http://localhost:8000/packages/browser/src/BrowserServer.ts";

    const server = BrowserServer.listen({
      handle(_request) {
        return "hi from the worker";
      }
    });
  `);

  const client = BrowserClient.from(worker);
  const response = await client.fetch();

  assert.match(response, "hi from the worker");
});

test("a frame making a request to a shared worker", async () => {
  const worker = await Test.createSharedWorker(/* ts */ `
    import * as BrowserServer from "http://localhost:8000/packages/browser/src/BrowserServer.ts";

    const server = BrowserServer.listen({
      handle(_request) {
        return "hi from the worker";
      }
    });
  `);

  const client = BrowserClient.from(worker);
  const response = await client.fetch();

  assert.match(response, "hi from the worker");
});

test("using an address", async () => {
  const srcDoc = /* html */ `
    <script type="module" data-transpile>
      import * as BrowserServer from "http://localhost:8000/packages/browser/src/BrowserServer.ts";

      const server1 = BrowserServer.listen({
        address: "app:api?v=1",
        handle(_request) {
          return "hi from api v1";
        }
      });

      const server2 = BrowserServer.listen({
        address: "app:api?v=2",
        handle(_request) {
          return "hi from api v2";
        }
      });
    </script>
  `;

  const frame = await Test.createIframe(srcDoc);

  const clientV1 = BrowserClient.from(frame.contentWindow, {
    address: "app:api?v=1"
  });

  const clientV2 = BrowserClient.from(frame.contentWindow, {
    address: "app:api?v=2"
  });

  assert.match(await clientV1.fetch(), "hi from api v1");
  assert.match(await clientV2.fetch(), "hi from api v2");
});
