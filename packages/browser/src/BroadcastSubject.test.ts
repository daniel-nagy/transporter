import { firstValueFrom } from "@daniel-nagy/transporter/Observable/index.js";
import { assert, spy } from "sinon";

import * as BroadcastSubject from "./BroadcastSubject.js";
import * as Test from "./Test.js";

const { test } = Test;

test("using a broadcast subject to synchronize state between two same-origin browsing contexts", async () => {
  const darkMode = BroadcastSubject.fromChannel("darkMode");
  const next = spy();

  darkMode.subscribe(next);
  const change = firstValueFrom(darkMode);

  await Test.createIframe(
    /* html */ `
      <script type="module" data-transpile>
        import * as BroadcastSubject from "/packages/browser/src/BroadcastSubject.ts";
        const darkMode = BroadcastSubject.fromChannel("darkMode");
        darkMode.next(true);
      </script>
    `,
    { crossOrigin: false }
  );

  await change;

  assert.calledOnce(next);
  assert.calledWith(next, true);
});
