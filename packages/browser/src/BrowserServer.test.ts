import * as AddressBook from "@daniel-nagy/transporter/Protocol/AddressBook";
import { assert, spy } from "sinon";

import * as BrowserServer from "./BrowserServer.js";
import * as Test from "./Test.js";

const { test } = Test;

test("A server must have a globally unique address", () => {
  using _server = BrowserServer.listen({
    address: "",
    handle() {}
  });

  const listenSpy = spy(BrowserServer.listen);

  try {
    listenSpy({ address: "", handle() {} });
  } catch (e) {}

  assert.threw(listenSpy, AddressBook.UniqueAddressError.name);
});

test("An address is released when the server is stopped", () => {
  const server = BrowserServer.listen({
    address: "",
    handle() {}
  });

  server.stop();

  using _server = BrowserServer.listen({
    address: "",
    handle() {}
  });

  assert.pass(true);
});
