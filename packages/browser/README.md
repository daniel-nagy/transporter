# Browser

The browser package contains APIs designed to work in the browser.

```
npm add @daniel-nagy/transporter @daniel-nagy/transporter-browser
```

Transporter is distributed as ES modules.

Transporter may also be imported directly in the browser from a URL. For example,

```html
<script type="importmap">
  {
    "imports": {
      "@daniel-nagy/transporter/": "https://unpkg.com/@daniel-nagy/transporter@1.0.0-beta.3/build/",
      "@daniel-nagy/transporter-browser/": "https://unpkg.com/@daniel-nagy/transporter-browser@1.0.0-beta.3/build/"
    }
  }
</script>
<script type="module">
  import * as BrowserServer from "@daniel-nagy/transporter-browser/BrowserServer.js";
  import * as Session from "@daniel-nagy/transporter/Session.js";
</script>
```

## API

The browser package contains the following modules.

- [BroadcastSubject](#BroadcastSubject)
- [BrowserClient](#BrowserClient)
- [BrowserRequest](#BrowserRequest)
- [BrowserResponse](#BrowserResponse)
- [BrowserServer](#BrowserServer)
- [BrowserSocket](#BrowserSocket)
- [BrowserSocket.Message](#BrowserSocketMessage)
- [BrowserSocket.State](#BrowserSocketState)
- [BrowserSocketServer](#BrowserSocketServer)
- [StructuredCloneable](#StructuredCloneable)

### BroadcastSubject

<sup>_Module_</sup>

A `BroadcastSubject` can be used to synchronize state between same-origin browsing contexts or workers.

###### Types

- [BroadcastSubject](#BroadcastSubject_BroadcastSubject)

###### Constructors

- [fromChannel](#FromChannel)

<h4 id="BroadcastSubject_BroadcastSubject">BroadcastSubject</h4>

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

- [BrowserClient](#BrowserClient_BrowserClient)
- [Options](#Options)

###### Constants

- [WS](#WS)

###### Constructors

- [from](#From)

###### Methods

- [fetch](#Fetch)

<h4 id="BrowserClient_BrowserClient">BrowserClient</h4>

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

#### WS

<sup>_Constant_</sup>

```ts
const SW = Symbol.for("ServiceWorker");
```

An atom that symbolizes a `ServiceWorker`. When used as a target the client will make requests to the currently active `ServiceWorker`.

##### Example

```ts
import * as BrowserClient from "@daniel-nagy/transporter-browser/BrowserClient";

await navigator.serviceWorker.register("./sw.js", {
  type: "module"
});

const client = BrowserClient.from(BrowserClient.SW);
```

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

- [BrowserServer](#BrowserServer_BrowserServer)
- [Options](#BrowserServer_Options)
- [RequestHandler](#RequestHandler)
- [State](#State)

###### Constructors

- [listen](#listen)

###### Methods

- [stop](#Stop)

<h4 id="BrowserServer_BrowserServer">BrowserServer</h4>

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

<h4 id="BrowserServer_Options">Options</h4>

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

- [BrowserSocket](#BrowserSocket_BrowserSocket)
- [ConnectionError](#ConnectionError)
- [ConnectTimeoutError](#ConnectTimeoutError)
- [DisconnectTimeoutError](#DisconnectTimeoutError)
- [HeartbeatTimeoutError](#HeartbeatTimeoutError)
- [Options](#BrowserSocket_Options)
- [WindowOptions](#WindowOptions)

###### Constructors

- [connect](#connect)

###### Methods

- [close](#Close)
- [ping](#Ping)
- [send](#Send)

<h4 id="BrowserSocket_BrowserSocket">BrowserSocket</h4>

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

<h4 id="BrowserSocket_Options">Options</h4>

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

Closes the socket causing its state to transition to `Closing`.

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

Internal messages to facilitate the socket API. These messages are filtered from the data received from the socket.

###### Types

- [Connect](#Message_Connect)
- [Connected](#Connected)
- [Disconnect](#Disconnect)
- [Disconnected](#Disconnected)
- [Message](#Message)
- [Ping](#Message_Ping)
- [Pong](#Pong)
- [Type](#Type)

###### Functions

- [isMessage](#IsMessage)
- [isType](#IsType)
- [typeOf](#typeOf)

<h4 id="Message_Connect">Connect</h4>

<sup>_Type_</sup>

```ts
type Connect = {
  address: string;
  type: Type.Connect;
};
```

Sent when a connection is initiated. This starts the "handshake".

#### Connect

<sup>_Type_</sup>

```ts
type Connected = {
  type: Type.Connected;
};
```

A message indicating the connection is complete and was successful. This concludes the "handshake".

#### Disconnect

<sup>_Type_</sup>

```ts
type Disconnect = {
  type: Type.Disconnect;
};
```

Sent when a socket is closing so that the other endpoint may preform some cleanup logic or otherwise close the connection gracefully. This starts the "closing handshake".

#### Disconnected

<sup>_Type_</sup>

```ts
type Disconnected = {
  type: Type.Disconnected;
};
```

A message that acknowledges the disconnection. If this message is received then the disconnect was graceful. This concludes the "closing handshake".

#### Message

<sup>_Type_</sup>

```ts
export type Message =
  | Connect
  | Connected
  | Disconnect
  | Disconnected
  | Ping
  | Pong;
```

A variant type for the different types of messages.

<h4 id="Message_Ping">Ping</h4>

<sup>_Type_</sup>

```ts
type Ping = {
  id: string;
  type: Type.Ping;
};
```

A ping message may be sent to solicit a response from the other endpoint.

#### Pong

<sup>_Type_</sup>

```ts
type Pong = {
  id: string;
  type: Type.Pong;
};
```

A pong message must always be sent in response to a ping message.

#### Type

<sup>_Type_</sup>

```ts
enum Type {
  Connect = "Connect",
  Connected = "Connected",
  Disconnect = "Disconnect",
  Disconnected = "Disconnected",
  Ping = "Ping",
  Pong = "Pong"
}
```

An enumerable of the different types of socket messages.

#### IsMessage

<sup>_Function_</sup>

```ts
function isMessage(message: StructuredCloneable.t): message is Message;
```

Returns `true` if the message is a socket message.

#### IsType

<sup>_Function_</sup>

```ts
function isType<T extends Type>(
  message: StructuredCloneable.t,
  type: T
): message is {
  [Type.Connect]: Connect;
  [Type.Connected]: Connected;
  [Type.Disconnect]: Disconnect;
  [Type.Disconnected]: Disconnected;
  [Type.Ping]: Ping;
  [Type.Pong]: Pong;
}[T];
```

Returns `true` if the message is of the specified type.

#### TypeOf

<sup>_Function_</sup>

```ts
function typeOf(message: StructuredCloneable.t): Type | null;
```

Returns the message `Type` if the message is a socket message. Returns `null` otherwise.

### BrowserSocket.State

<sup>_Module_</sup>

A socket's state.

###### Types

- [Closed](#Closed)
- [Closing](#Closing)
- [Connected](#State_Connected)
- [Connecting](#Connecting)
- [State](#State_State)
- [Type](#State_Type)

#### Closed

<sup>_Type_</sup>

```ts
type Closed<E> = {
  error?: E;
  type: Type.Closed;
};
```

The socket is closed, possibly with an error.

#### Closing

<sup>_Type_</sup>

```ts
type Closing<E> = {
  error?: E;
  type: Type.Closing;
};
```

The socket is closing, possibly with an error.

<h4 id="State_Connected">Connected</h4>

<sup>_Type_</sup>

```ts
type Connected = {
  type: Type.Connected;
};
```

The socket is connected.

#### Connecting

<sup>_Type_</sup>

```ts
type Connecting = {
  type: Type.Connecting;
};
```

The socket is connecting.

<h4 id="State_State">State</h4>

<sup>_Type_</sup>

```ts
type State =
  | Connecting
  | Connected
  | Closing<Error.ConnectionError>
  | Closed<Error.DisconnectTimeoutError>;
```

A variant type for the different socket states.

<h4 id="State_Type">Type</h4>

<sup>_Type_</sup>

```ts
enum Type {
  Connecting = "Connecting",
  Connected = "Connected",
  Closing = "Closing",
  Closed = "Closed"
}
```

An enumerable of the different socket states.

### BrowserSocketServer

<sup>_Module_</sup>

A `BrowserSocketServer` listens for socket connect requests. When a request is received it will create a corresponding socket server side and complete the handshake.

###### Types

- [BrowserSocketServer](#BrowserSocketServer_BrowserSocketServer)
- [Options](#BrowserSocketServer_Options)
- [SocketOptions](#SocketOptions)
- [State](#BrowserSocketServer_State)

###### Constructors

- [listen](#BrowserSocketServer_Listen)

###### Methods

- [stop](#BrowserSocketServer_Stop)

<h4 id="BrowserSocketServer_BrowserSocketServer">BrowserSocketServer</h4>

<sup>_Type_</sup>

```ts
class BrowserSocketServer {
  public readonly address: string;
  public readonly connect: Observable.t<BrowserSocket.t>;
  public readonly state: State;
  public readonly stateChange: Observable.t<State>;
  public readonly stopped: Observable.t<State.Stopped>;
}
```

Creates socket connections as requests come in.

<h4 id="BrowserSocketServer_Options">Options</h4>

<sup>_Type_</sup>

```ts
type Options = {
  /**
   * The address of the server. The default is an empty string.
   */
  address?: string;
  /**
   * Allows intercepting connection requests and denying the request if
   * necessary.
   */
  connectFilter?(message: MessageEvent<Message.Connect>): boolean;
  /**
   * Forwarded to the socket that is created on connection.
   */
  socketOptions?: SocketOptions;
};
```

Options when creating a `BrowserSocketServer`.

#### SocketOptions

<sup>_Type_</sup>

```ts
type SocketOptions = {
  disconnectTimeout?: number;
  heartbeatInterval?: number;
  heartbeatTimeout?: number;
};
```

Options forwarded to the `BrowserSocket` when it is created.

<h4 id="BrowserSocketServer_State">State</h4>

<sup>_Type_</sup>

```ts
enum State {
  Listening = "Listening",
  Stopped = "Stopped"
}
```

An enumerable of the different server states.

<h4 id="BrowserSocketServer_Listen">Listen</h4>

<sup>_Constructor_</sup>

```ts
function listen(options?: Options): BrowserSocketServer;
```

Creates a new `BrowserSocketServer`. Throws a `UniqueAddressError` if the address is already taken.

#### Example

```ts
import * as BrowserSocketServer from "@daniel-nagy/transporter/BrowserSocketServer";

const server = BrowserSocketServer.listen();
server.connect.subscribe((socket) => socket.send("👋"));
```

<h4 id="BrowserSocketServer_Stop">Stop</h4>

<sup>_Method_</sup>

```ts
function stop(): void;
```

Stops the server. A disconnect message will be sent to all connected clients.

#### Example

```ts
import * as BrowserSocketServer from "@daniel-nagy/transporter/BrowserSocketServer";

const server = BrowserSocketServer.listen();
server.stop();
```

### StructuredCloneable

<sup>_Module_</sup>

A `StructuredCloneable` type can be passed between processes in the browser.

###### Types

- [StructuredCloneable](#StructuredCloneable_StructuredCloneable)
- [TypedArray](#TypedArray)

<h4 id="StructuredCloneable_StructuredCloneable">StructuredCloneable</h4>

<sup>_Type_</sup>

```ts
type StructuredCloneable =
  | void
  | null
  | undefined
  | boolean
  | number
  | bigint
  | string
  | Date
  | ArrayBuffer
  | RegExp
  | TypedArray
  | Array<StructuredCloneable>
  | Map<StructuredCloneable, StructuredCloneable>
  | Set<StructuredCloneable>
  | { [key: string]: StructuredCloneable };
```

A value that can be cloned using the [structured clone algorithm](https://developer.mozilla.org/en-US/docs/Web/API/structuredClone).

#### TypedArray

<sup>_Type_</sup>

```ts
type TypedArray =
  | BigInt64Array
  | BigUint64Array
  | Float32Array
  | Float64Array
  | Int8Array
  | Int16Array
  | Int32Array
  | Uint8Array
  | Uint8ClampedArray
  | Uint16Array
  | Uint32Array;
```

A `TypedArray` object describes an array-like view of an underlying binary data buffer.
