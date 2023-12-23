import { type SinonSpy, assert, match, spy, useFakeTimers } from "sinon";
import * as Observable from "@daniel-nagy/transporter/Observable";

import * as BrowserSocket from "./BrowserSocket.js";
import * as BrowserSocketServer from "../BrowserSocketServer.js";
import * as Error from "./Error.js";
import * as Message from "./Message.js";
import * as State from "./State.js";
import * as Test from "../Test.js";

const { test } = Test;

test("a child frame connecting to a parent frame", async () => {
  using server = BrowserSocketServer.listen();

  const message = server.connect.pipe(
    Observable.flatMap((socket) => socket.receive),
    Observable.firstValueFrom
  );

  const srcDoc = /* html */ `
    <script type="module" data-transpile>
      import * as BrowserSocket from "/packages/browser/src/BrowserSocket/index.ts";
      using socket = BrowserSocket.connect(self.parent);
      socket.send("hi");
    </script>
  `;

  await Test.createIframe(srcDoc);
  assert.match(await message, "hi");
});

test("a parent frame connecting to a child frame", async () => {
  const srcDoc = /* html */ `
    <script type="module" data-transpile>
      import * as BrowserSocketServer from "/packages/browser/src/BrowserSocketServer.ts";

      BrowserSocketServer.listen().connect.subscribe((socket) => {
        socket.receive.subscribe((message) => {
          switch (message) {
            case "What's up?":
              socket.send("Not much. You?");
          }
        });
      });
    </script>
  `;

  const iframe = await Test.createIframe(srcDoc);
  using socket = BrowserSocket.connect(iframe.contentWindow);
  const message = socket.receive.pipe(Observable.firstValueFrom);

  socket.send("What's up?");
  assert.match(await message, "Not much. You?");
});

test("a frame connecting to a dedicated worker", async () => {
  const worker = await Test.createWorker(/* ts */ `
    import * as BrowserSocketServer from "http://localhost:8000/packages/browser/src/BrowserSocketServer.ts";

    BrowserSocketServer.listen().connect.subscribe((socket) => {
      socket.receive.subscribe((message) => {
        switch (message) {
          case "What's up?":
            socket.send("Not much. You?");
        }
      });
    });
  `);

  using socket = BrowserSocket.connect(worker);
  const message = socket.receive.pipe(Observable.firstValueFrom);

  socket.send("What's up?");
  assert.match(await message, "Not much. You?");
});

test("a frame connecting to a shared worker", async () => {
  const worker = await Test.createSharedWorker(/* ts */ `
    import * as BrowserSocketServer from "http://localhost:8000/packages/browser/src/BrowserSocketServer.ts";

    BrowserSocketServer.listen().connect.subscribe((socket) => {
      socket.receive.subscribe((message) => {
        switch (message) {
          case "What's up?":
            socket.send("Not much. You?");
        }
      });
    });
  `);

  using socket = BrowserSocket.connect(worker);
  const message = socket.receive.pipe(Observable.firstValueFrom);

  socket.send("What's up?");
  assert.match(await message, "Not much. You?");
});

describe("socket state transitions", () => {
  test("a socket starts in a connected state", async () => {
    const srcDoc = /* html */ `
      <script type="module" data-transpile>
        import * as BrowserSocketServer from "/packages/browser/src/BrowserSocketServer.ts";
        BrowserSocketServer.listen();
      </script>
    `;

    const iframe = await Test.createIframe(srcDoc);
    using socket = BrowserSocket.connect(iframe.contentWindow);
    assert.match(socket.state, State.Connecting());
  });

  test("a socket transitions from a connecting state to a connected state once connected", async () => {
    const srcDoc = /* html */ `
      <script type="module" data-transpile>
        import * as BrowserSocketServer from "/packages/browser/src/BrowserSocketServer.ts";
        BrowserSocketServer.listen();
      </script>
    `;

    const iframe = await Test.createIframe(srcDoc);
    using socket = BrowserSocket.connect(iframe.contentWindow);

    await socket.connected.pipe(Observable.firstValueFrom);
    assert.match(socket.state, State.Connected());
  });

  test("a socket transitions from a connecting state to a closing state if close is called before it is connected", async () => {
    const srcDoc = /* html */ `
      <script type="module" data-transpile>
        import * as BrowserSocketServer from "/packages/browser/src/BrowserSocketServer.ts";
        BrowserSocketServer.listen();
      </script>
    `;

    const iframe = await Test.createIframe(srcDoc);
    using socket = BrowserSocket.connect(iframe.contentWindow);
    const seenStates: State.State[] = [];

    socket.stateChange.subscribe((state) => seenStates.push(state));
    socket.close();
    await socket.closing.pipe(Observable.firstValueFrom);

    assert.match(seenStates, [State.Connecting(), State.Closing()]);
    assert.match(socket.state, State.Closing());
  });

  test("a socket transitions from a connecting state to a closing state if the connection times out", async () => {
    const srcDoc = /* html */ `
      <script type="module" data-transpile>
        // Do not start a server
      </script>
    `;

    const iframe = await Test.createIframe(srcDoc);
    const clock = useFakeTimers();

    using socket = BrowserSocket.connect(iframe.contentWindow, {
      connectTimeout: 1000
    });

    const seenStates: State.State[] = [];

    socket.stateChange.subscribe((state) => seenStates.push(state));

    clock.tick(1000);
    clock.restore();

    await socket.closing.pipe(Observable.firstValueFrom);

    const closingState = {
      ...State.Closing(),
      error: match.instanceOf(Error.ConnectTimeoutError)
    };

    assert.match(seenStates, [State.Connecting(), closingState]);
    assert.match(socket.state, closingState);
  });

  test("a socket transitions from a connecting state to a closing state if the buffer overflows", async () => {
    const srcDoc = /* html */ `
      <script type="module" data-transpile>
        import * as BrowserSocketServer from "/packages/browser/src/BrowserSocketServer.ts";
        BrowserSocketServer.listen();
      </script>
    `;

    const iframe = await Test.createIframe(srcDoc);
    using socket = BrowserSocket.connect(iframe.contentWindow, {
      bufferLimit: 0
    });

    const seenStates: State.State[] = [];

    socket.stateChange.subscribe((state) => seenStates.push(state));
    socket.send("hi");

    await socket.closing.pipe(Observable.firstValueFrom);

    const closingState = {
      ...State.Closing(),
      error: match.instanceOf(Observable.BufferOverflowError)
    };

    assert.match(seenStates, [State.Connecting(), closingState]);
    assert.match(socket.state, closingState);
  });

  test("a socket transitions from a connecting state to a closing state if the socket is disposed", async () => {
    const srcDoc = /* html */ `
      <script type="module" data-transpile>
        import * as BrowserSocketServer from "/packages/browser/src/BrowserSocketServer.ts";
        BrowserSocketServer.listen();
      </script>
    `;

    const iframe = await Test.createIframe(srcDoc);

    let closing: Promise<State.State>;
    const seenStates: State.State[] = [];

    {
      using socket = BrowserSocket.connect(iframe.contentWindow);
      socket.stateChange.subscribe((state) => seenStates.push(state));
      closing = socket.closing.pipe(Observable.firstValueFrom);
    }

    await closing;

    assert.match(seenStates, [State.Connecting(), State.Closing()]);
  });

  test("a socket transitions from a connected state to a closing state if the close method is called", async () => {
    using _server = BrowserSocketServer.listen();
    using socket = BrowserSocket.connect(self);
    const seenStates: State.State[] = [];

    socket.stateChange.subscribe((state) => seenStates.push(state));
    await socket.connected.pipe(Observable.firstValueFrom);
    socket.close();

    assert.match(seenStates, [
      State.Connecting(),
      State.Connected(),
      State.Closing()
    ]);
  });

  test("a socket transitions from a connected state to a closing state if a disconnect message is received", async () => {
    const channel = new MessageChannel();
    using socket = BrowserSocket.fromPort(channel.port1);
    const seenStates: State.State[] = [];

    socket.stateChange.subscribe((state) => seenStates.push(state));
    channel.port2.postMessage(Message.Disconnect());
    await socket.closing.pipe(Observable.firstValueFrom);

    assert.match(seenStates, [
      State.Connected(),
      State.Closing(),
      State.Closed()
    ]);
  });

  test("a socket transitions from a connected state to a closing state if it is disposed", async () => {
    const seenStates: State.State[] = [];
    using _server = BrowserSocketServer.listen();

    {
      using socket = BrowserSocket.connect(self);
      socket.stateChange.subscribe((state) => seenStates.push(state));
      await socket.connected.pipe(Observable.firstValueFrom);
    }

    assert.match(seenStates, [
      State.Connecting(),
      State.Connected(),
      State.Closing()
    ]);
  });

  test("a socket transitions from a connected state to a closing state if a heartbeat times out.", async () => {
    const clock = useFakeTimers({ shouldClearNativeTimers: true });
    const channel = new MessageChannel();

    const socket = BrowserSocket.fromPort(channel.port1, {
      heartbeatInterval: 1000,
      heartbeatTimeout: 1000
    });

    const seenStates: State.State[] = [];

    socket.stateChange.subscribe((state) => seenStates.push(state));

    clock.tick(2000);
    clock.restore();
    await socket.closing.pipe(Observable.firstValueFrom);

    assert.match(seenStates, [
      State.Connected(),
      {
        ...State.Closing(),
        error: match.instanceOf(Error.HeartbeatTimeoutError)
      }
    ]);
  });

  test("a socket transitions from a closing state to a closed state if a disconnected message is received", async () => {
    const channel = new MessageChannel();
    const socket = BrowserSocket.fromPort(channel.port1);
    const seenStates: State.State[] = [];

    socket.stateChange.subscribe((state) => seenStates.push(state));
    socket.close();
    channel.port2.postMessage(Message.Disconnected());
    await socket.closed.pipe(Observable.firstValueFrom);

    assert.match(seenStates, [
      State.Connected(),
      State.Closing(),
      State.Closed()
    ]);
  });

  test("a socket transitions from a closing state to a closed state if disconnecting times out", async () => {
    const clock = useFakeTimers();
    const channel = new MessageChannel();

    const socket = BrowserSocket.fromPort(channel.port1, {
      disconnectTimeout: 1000
    });

    const seenStates: State.State[] = [];

    socket.stateChange.subscribe((state) => seenStates.push(state));
    socket.close();
    clock.tick(1000);
    clock.restore();

    assert.match(seenStates, [
      State.Connected(),
      State.Closing(),
      {
        ...State.Closed(),
        error: match.instanceOf(Error.DisconnectTimeoutError)
      }
    ]);
  });
});

test("the socket state completes once closed", async () => {
  const channel = new MessageChannel();
  const socket = BrowserSocket.fromPort(channel.port1);
  const complete = spy();

  socket.stateChange.subscribe({ complete });
  socket.close();
  channel.port2.postMessage(Message.Disconnected());
  await socket.closed.pipe(Observable.firstValueFrom);

  assert.calledOnce(complete);
});

test("the message port is closed when a socket is closed", async () => {
  const channel = new MessageChannel();
  const socket = BrowserSocket.fromPort(channel.port1);
  const close = spy(channel.port1, "close");

  socket.close();
  channel.port2.postMessage(Message.Disconnected());
  await socket.closed.pipe(Observable.firstValueFrom);

  assert.calledOnce(close);
});

test("passing an origin when connecting to a window", async () => {
  const srcDoc = /* html */ `
    <script type="module" data-transpile>
      import * as BrowserSocketServer from "/packages/browser/src/BrowserSocketServer.ts";
      BrowserSocketServer.listen();
    </script>
  `;

  const iframe = await Test.createIframe(srcDoc);

  // The iframe will be cross origin so the connection will fail.
  using socket = BrowserSocket.connect(iframe.contentWindow, {
    // 10 is somewhat arbitrary but it seems to be long enough to avoid false
    // positives.
    connectTimeout: 10,
    origin: location.origin
  });

  const seenStates: State.State[] = [];
  socket.stateChange.subscribe((state) => seenStates.push(state));
  await socket.closing.pipe(Observable.firstValueFrom);

  assert.match(seenStates, [
    State.Connecting(),
    { ...State.Closing(), error: match.instanceOf(Error.ConnectTimeoutError) }
  ]);
});

test("the socket heartbeat is delayed until connection", async () => {
  const clock = useFakeTimers();
  const channel = new MessageChannel();
  const socket = BrowserSocket.fromPort(channel.port1, {
    connected: false,
    connectTimeout: 1000,
    heartbeatInterval: 250,
    heartbeatTimeout: 250
  });

  const seenStates: State.State[] = [];
  socket.stateChange.subscribe((state) => seenStates.push(state));

  clock.tick(500);
  clock.restore();
  channel.port2.postMessage(Message.Connected());

  await socket.connected.pipe(Observable.firstValueFrom);

  assert.match(seenStates, [State.Connecting(), State.Connected()]);
});

test("the socket heartbeat is unsubscribed when the socket is closing", async () => {
  const clock = useFakeTimers();
  const channel = new MessageChannel();
  const socket = BrowserSocket.fromPort(channel.port1, {
    heartbeatInterval: 1000,
    heartbeatTimeout: 1000
  });

  const seenStates: State.State[] = [];
  socket.stateChange.subscribe((state) => seenStates.push(state));

  clock.tick(1500);
  socket.close();
  await socket.closing.pipe(Observable.firstValueFrom);
  clock.tick(500);
  clock.restore();

  assert.match(seenStates, [State.Connected(), State.Closing()]);
});

test("no more messages can be sent once the socket is closing", async () => {
  const port = new MessageChannel().port1;
  const socket = BrowserSocket.fromPort(port);
  const postMessage = spy(port, "postMessage");

  socket.send("👋");
  socket.close();
  socket.send("🙈");

  assert.callCount(postMessage, 2);
  assert.calledWith(postMessage.firstCall, "👋");
  assert.calledWith(postMessage.secondCall, Message.Disconnect());
  assert.neverCalledWith(postMessage, "🙈");
});

test("a pong message is sent when a ping message is received", async () => {
  const channel = new MessageChannel();
  using _socket = BrowserSocket.fromPort(channel.port1);
  const ping = Message.Ping();
  const message = Observable.fromEvent<MessageEvent>(
    channel.port2,
    "message"
  ).pipe(Observable.firstValueFrom);
  channel.port2.start();
  channel.port2.postMessage(ping);
  assert.match((await message).data, Message.Pong({ id: ping.id }));
});

test("ping returns a promise that resolves when a pong message is received", async () => {
  const channel = new MessageChannel();
  using _socket1 = BrowserSocket.fromPort(channel.port1);
  using socket2 = BrowserSocket.fromPort(channel.port2);
  assert.match(await socket2.ping(), undefined);
});

test("ping rejects if a pong is not received before timing out", async () => {
  const channel = new MessageChannel();
  using socket = BrowserSocket.fromPort(channel.port1);
  assert.match(
    await socket.ping(10).catch((error) => error),
    match.instanceOf(Observable.TimeoutError)
  );
});

test("close is not called on dispose if the socket is already closed", async () => {
  let close: SinonSpy<[error?: Error.ConnectionError | undefined], void>;
  let closing: Promise<State.State>;

  {
    using socket = BrowserSocket.fromPort(new MessageChannel().port1);
    close = spy(socket, "close");
    closing = socket.closing.pipe(Observable.firstValueFrom);
    socket.close();
  }

  await closing;
  assert.callCount(close, 1);
});

test("the socket unsubscribes from messages after it is closed", async () => {
  const channel = new MessageChannel();
  using socket = BrowserSocket.fromPort(channel.port1);
  const complete = spy();

  socket.receive.subscribe({ complete });
  socket.close();

  assert.calledOnce(complete);
});

test("internal messages are filtered from the public receive observable", async () => {
  const channel = new MessageChannel();
  const socket = BrowserSocket.fromPort(channel.port1, { connected: false });
  const receive = spy();
  socket.receive.subscribe(receive);

  channel.port2.postMessage("👋");
  channel.port2.postMessage(Message.Connected());

  await socket.connected.pipe(Observable.firstValueFrom);

  assert.callCount(receive, 1);
  assert.calledWith(receive, "👋");
  assert.neverCalledWith(receive, Message.Connected());
});

test("connecting to a server with an explicit address", async () => {
  using server1 = BrowserSocketServer.listen();
  using server2 = BrowserSocketServer.listen({ address: "🍌" });
  const server1Connect = spy();
  const server2Connect = spy();
  server1.connect.subscribe(server1Connect);
  server2.connect.subscribe(server2Connect);
  const socket = BrowserSocket.connect(self, { serverAddress: "🍌" });

  await socket.connected.pipe(Observable.firstValueFrom);

  assert.callCount(server1Connect, 0);
  assert.callCount(server2Connect, 1);
});

test("using a buffer overflow strategy", async () => {
  using server = BrowserSocketServer.listen();

  const message = server.connect.pipe(
    Observable.flatMap((socket) => socket.receive),
    Observable.firstValueFrom
  );

  using socket = BrowserSocket.connect(self, {
    bufferLimit: 1,
    bufferOverflowStrategy: Observable.BufferOverflowStrategy.DropOldest
  });

  socket.send("🍔");
  socket.send("🌭");
  await socket.connected.pipe(Observable.firstValueFrom);

  assert.match(await message, "🌭");
});
