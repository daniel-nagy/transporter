# Browser

The browser package contains APIs designed to work in the browser.

```
npm add @daniel-nagy/transporter @daniel-nagy/transporter-browser
```

Transporter is distributed as ES modules. Transport may also be imported directly in the browser from a URL.

## API

The browser package contains the following modules.

- [BroadcastSubject](#BroadcastSubject)
- [BrowserClient](#BrowserClient)
- [BrowserRequest](#BrowserRequest)
- [BrowserResponse](#BrowserResponse)
- [BrowserServer](#MessaBrowserServerge)
- [BrowserSocket](#BrowserSocket)
- [BrowserSocket.Message](#BrowserSocket.Message)
- [BrowserSocket.State](#BrowserSocket.State)
- [BrowserSocketServer](#BrowserSocketServer)
- [StructuredCloneable](#StructuredCloneable)

### BroadcastSubject

<sup>_Module_</sup>

A `BroadcastSubject` can be used to synchronize state between same-origin browsing contexts or workers.

###### Types

- [BroadcastSubject](#BroadcastSubject)

###### Constructors

- [fromChannel](#FromChannel)

#### BroadcastSubject

<sup>_Type_</sup>

```ts
class BroadcastSubject<T extends StructuredCloneable.t> extends Subject.t<T> {}
```

A `BroadcastSubject` is a `Subject` that broadcasts emitted values over a [`BroadcastChannel`](https://developer.mozilla.org/en-US/docs/Web/API/BroadcastChannel).

#### FromChannel

<sup>_Constructor_</sup>

```ts
function fromChannel<T extends StructuredCloneable.t>(
  name: string
): BroadcastSubject<T>;
```

Creates a `BroadcastSubject` from a broadcast channel name.

##### Example

```ts
import * as BroadcastSubject from "@daniel-nagy/transporter-browser/BroadcastSubject";
const darkMode = BroadcastSubject.fromChannel("darkMode");
darkMode.subscribe(console.log);
```

### BrowserClient

<sup>_Module_</sup>

An interface for making requests to a browsing context or worker.

###### Types

- [BrowserClient](#BrowserClient)
- [Options](#Options)

###### Constructors

- [from](#From)

###### Methods

- [fetch](Fetch)

#### BrowserClient

<sup>_Type_</sup>

```ts
class BrowserClient {
  /**
   * The address of the server. An address is like a port number, except an
   * address can be any string instead of a meaningless number.
   */
  public readonly serverAddress: string;
  /**
   * If the window and the origin do not match the connection will fail. The
   * origin is only relevant when connecting to a window since the browser
   * will require worker URLs to be same-origin.
   */
  public readonly origin: string;
  /**
   * The message target. A message target is like a server host.
   */
  public readonly target: Window | Worker | SharedWorker | ServiceWorker;
}
```

An object that may be used to make fetch requests to a browsing context or worker.

#### Options

<sup>_Type_</sup>

```ts
type Options = {
  /**
   * The address of the server. The default is the empty string.
   */
  address?: string;
  /**
   * When connecting to a `Window` you may specify the allowed origin. If the
   * window and the origin do not match the connection will fail. The origin is
   * passed directly to the `targetOrigin` parameter of `postMessage` when
   * connecting to the window. The default is `"*"`, which allows any origin.
   */
  origin?: string;
};
```

Options when creating a `BrowserClient`.

#### From

<sup>_Constructor_</sup>

```ts
function from(
  target: Window | Worker | SharedWorker | ServiceWorker,
  options?: Options
): BrowserClient;
```

Creates a new `BrowserClient`.

##### Example

```ts
import * as BrowserClient from "@daniel-nagy/transporter-browser/BrowserClient";

const worker = new Worker("/worker.js", { type: "module" });
const client = BrowserClient.from(worker);
```

#### Fetch

<sup>_Method_</sup>

```ts
fetch(body: StructuredCloneable.t): Promise<StructuredCloneable.t>;
```

Makes a request to a `BrowserServer`.

##### Example

```ts
import * as BrowserClient from "@daniel-nagy/transporter-browser/BrowserClient";

const worker = new Worker("/worker.js", { type: "module" });
const client = BrowserClient.from(worker);
const response = await client.fetch("👋");
```

### BrowserRequest

<sup>_Module_</sup>

A server receives a `Request` object when a client makes a request.

###### Types

- [Request](#Request)

###### Functions

- [isRequest](#IsRequest)

#### Request

<sup>_Type_</sup>

```ts
type Request = {
  address: string;
  /**
   * Contains the value sent by the client.
   */
  body: StructuredCloneable.t;
  id: string;
  /**
   * The origin of the client making the request. The origin will be set
   * securely on the server using `MessageEvent.origin`.
   */
  origin: string;
  type: "Request";
};
```

A `Request` is created when a client makes a fetch request.

#### IsRequest

<sup>_Function_</sup>

```ts
function isRequest(event: MessageEvent): event is MessageEvent<Request>;
```

Returns `true` if the message event contains a `Request` object.

### BrowserResponse

<sup>_Module_</sup>

A server sends a `Response` to a client in response to a request.

###### Types

- [Response](#Response)

###### Functions

- [isResponse](#IsResponse)

#### Response

<sup>_Type_</sup>

```ts
type Response = {
  /**
   * The payload of the response. This is the value the client will receive.
   */
  body: StructuredCloneable.t;
  id: string;
  type: "Response;
};
```

A `Response` is created from the value returned by the server's request handler.

#### IsResponse

<sup>_Function_</sup>

```ts
function isResponse(event: MessageEvent): event is MessageEvent<Response>;
```

Returns `true` if the message event contains a `Response` object.

### BrowserServer

<sup>_Module_</sup>

A `BrowserServer` provides request/response semantics on top of `postMessage`. It also normalizes the interface for connecting to different types of processes in the browser.

###### Types

- [BrowserServer](#BrowserServer)
- [Options](#Options)
- [RequestHandler](#RequestHandler)
- [State](#State)

###### Constructors

- [listen](#listen)

###### Methods

- [stop](#Stop)

#### BrowserServer

<sup>_Type_</Sup>

```ts
class BrowserServer {
  public readonly address: string;
  public readonly handle: RequestHandler;
  public readonly state: State;
  public readonly stateChange: Observable.t<State>;
  public readonly stopped: Observable.t<State.Stopped>;
}
```

A `BrowserServer` listens for incoming requests from clients.

#### Options

<sup>_Type_</sup>

```ts
type Options = {
  /**
   * The address of the server. The default is the empty string. All servers
   * must have a globally unique address.
   */
  address?: string;
  /**
   * Called whenever a request is received from a client. The request handler
   * may return anything that is structured cloneable.
   *
   * The request object will contain the origin of the client. The origin can be
   * used to validate the client before fulfilling the request.
   */
  handle: RequestHandler;
};
```

Options when creating a `BrowserServer`.

#### RequestHandler

<sup>_Type_</sup>

```ts
type RequestHandler = (
  request: Readonly<Request.t>
) => StructuredCloneable.t | Promise<StructuredCloneable.t>;
```

A `RequestHandler` receives a `Request` from a client and returns the body of the `Response` that will be sent back to the client.

#### State

<sup>_Type_</sup>

```ts
enum State {
  Listening = "Listening",
  Stopped = "Stopped"
}
```

An enumerable of the different server states.

#### Listen

<sup>_Constructor_</sup>

```ts
function listen(options: Options): BrowserServer;
```

Creates a new `BrowserServer` in the global scope. A `UniqueAddressError` will
be thrown if the address is already taken.

#### Example

```ts
import * as BrowserServer from "@daniel-nagy/transporter/BrowserServer";

const server = BrowserServer.listen({
  handle(request) {
    // Message received from client. Return any response.
    return "👋";
  }
});
```

#### Stop

<sup>_Method_</sup>

```ts
stop(): void;
```

Stops the server. Once stopped the server will no longer receive requests.

#### Example

```ts
import * as BrowserServer from "@daniel-nagy/transporter/BrowserServer";

const server = BrowserServer.listen({
  handle(request) {}
});

server.stop();
```

### BrowserSocket

<sup>_Module_</sup>

Provides a socket API on top of `postMessage` that is similar to the WebSocket API. A `BrowserSocket` is connection-oriented, duplex, and unicast. Any data that is structured cloneable can be passed through a browser socket.

###### Types

- [BrowserSocket](#BrowserSocket)
- [ConnectionError](#ConnectionError)
- [ConnectTimeoutError](#ConnectTimeoutError)
- [DisconnectTimeoutError](#DisconnectTimeoutError)
- [HeartbeatTimeoutError](#HeartbeatTimeoutError)
- [Options](#Options)
- [WindowOptions](#WindowOptions)

###### Constructors

- [connect](#connect)

###### Methods

- [close](#Close)
- [ping](#Ping)
- [send](#Send)

#### BrowserSocket

<sup>_Type_</sup>

```ts
class BrowserSocket {
  /**
   * Emits when the socket's state changes to `Closed` and then completes.
   */
  public readonly closed: Observable.t<State.Closed>;
  /**
   * Emits when the socket's state changes to `Closing` and then completes.
   */
  public readonly closing: Observable.t<State.Closing>;
  /**
   * Emits if the socket's state changes to `Connected` and then completes. If
   * the socket errors during connection it will complete without emitting.
   */
  public readonly connected: Observable.t<State.Connected>;
  /**
   * Emits when the socket receives data.
   */
  public readonly receive: Observable.t<StructuredCloneable.t>;
  /**
   * The current state of the socket.
   */
  public readonly state: State;
  /**
   * Emits when the socket's state changes. Completes when the socket state
   * becomes `Closed`.
   */
  public readonly stateChange: Observable.t<State>;
}
```

A `BrowserSocket` is used to create a connection between browsing contexts or a browsing context and a worker context.

#### ConnectionError

<sup>_Type_</sup>

```ts
type ConnectionError =
  | Observable.BufferOverflowError
  | ConnectTimeoutError
  | HeartbeatTimeoutError;
```

A variant type for the different reasons a socket may transition to a closing state with an error.

#### ConnectTimeoutError

<sup>_Type_</sup>

```ts
class ConnectTimeoutError extends Error {}
```

Used to indicate that the connection failed because the server did not complete the connection in the allotted time.

#### DisconnectTimeoutError

<sup>_Type_</sup>

```ts
class DisconnectTimeoutError extends Error {}
```

Used to indicate that an acknowledgement was not received when closing the connection in the allotted time.

#### HeartbeatTimeoutError

<sup>_Type_</sup>

```ts
class HeartbeatTimeoutError extends Error {}
```

Used to indicate that a response to a health-check was not received in the allotted time.

#### Options

<sup>_Type_</sup>

```ts
interface Options {
  /**
   * The maximum number of messages to buffer before the socket is connected.
   * The default is `Infinity`.
   */
  bufferLimit?: number;
  /**
   * What to do incase there is a buffer overflow. The default is to error.
   */
  bufferOverflowStrategy?: Observable.BufferOverflowStrategy;
  /**
   * The maximum amount of time to wait for a connection in milliseconds. The
   * default is `2000` or 2 seconds.
   */
  connectTimeout?: number;
  /**
   * The maximum amount of time to wait for a disconnection in milliseconds. The
   * default is `2000` or 2 seconds.
   */
  disconnectTimeout?: number;
  /**
   * The frequency at which to request heartbeats in milliseconds. The default
   * is `1000` or 1 second.
   */
  heartbeatInterval?: number;
  /**
   * The maximum amount of time to wait for a heartbeat in milliseconds. The
   * default is `2000` or 2 seconds.
   */
  heartbeatTimeout?: number;
  /**
   * The address of the socket server.
   */
  serverAddress?: string;
}
```

Options when creating a `BrowserSocket`.

#### WindowOptions

<sup>_Type_</sup>

```ts
interface WindowOptions extends Options {
  /**
   * When connecting to a `Window` you may specify the allowed origin. If the
   * window and the origin do not match the connection will fail. The origin is
   * passed directly to the `targetOrigin` parameter of `postMessage` when
   * connecting to the window. The default is `"*"`, which allows any origin.
   */
  origin?: string;
}
```

Additional options when connecting to a browsing context.

#### Connect

<sup>_Constructor_</sup>

```ts
function connect(
  target: SharedWorker | Window | Worker,
  options?: Options | WindowOptions
): BrowserSocket;
```

Creates a new `BrowserSocket`. The socket will start in a `Connecting` state.

##### Example

```ts
import * as BrowserSocket from "@daniel-nagy/transporter/BrowserSocket";
using socket = BrowserSocket.connect(self.parent);
```

#### Close

<sup>_Method_</sup>

```ts
close(): void;
```

Closes the socket causing its state to transition to closing.

##### Example

```ts
import * as BrowserSocket from "@daniel-nagy/transporter/BrowserSocket";
const socket = BrowserSocket.connect(self.parent);
socket.close();
```

#### Ping

<sup>_Method_</sup>

```ts
ping(timeout: number = 2000): Promise<void>;
```

Sends a ping to a connected socket and waits for a pong to be sent back. Returns a promise that resolves when a pong is received or rejects if a pong is not received in the allotted time.

##### Example

```ts
import * as BrowserSocket from "@daniel-nagy/transporter/BrowserSocket";
using socket = BrowserSocket.connect(self.parent);
await socket.ping();
```

#### Send

<sup>_Method_</sup>

```ts
send(message: StructuredCloneable.t): void;
```

Sends data through the socket. Data will automatically be buffered until the socket connects.

##### Example

```ts
import * as BrowserSocket from "@daniel-nagy/transporter/BrowserSocket";
const socket = BrowserSocket.connect(self.parent);
socket.send("👋");
```

### BrowserSocket.Message

<sup>_Module_</sup>

###### Types

- [Connect](#Connect)
- [Connected](#Connected)
- [Disconnect](#Disconnect)
- [Disconnected](#Disconnected)
- [Message](#Message)
- [Ping](#Ping)
- [Pong](#Pong)
- [Type](#Type)

###### Functions

- [isMessage](#IsMessage)
- [isType](#IsType)
- [typeOf](#typeOf)

### BrowserSocket.State

<sup>_Module_</sup>

###### Types

- [Closed](#Closed)
- [Closing](#Closing)
- [Connected](#Connected)
- [Connecting](#Connecting)
- [State](#State)
- [Type](#Type)

### BrowserSocketServer

<sup>_Module_</sup>

###### Types

- [BrowserSocketServer](#BrowserSocketServer)
- [Options](#Options)
- [SocketOptions](#SocketOptions)
- [State](#State)

###### Constructors

- [listen](#Listen)

###### Methods

- [stop](#Stop)

### StructuredCloneable

<sup>_Module_</sup>

###### Types

- [StructuredCloneable](#StructuredCloneable)
- [TypedArray](#TypedArray)
