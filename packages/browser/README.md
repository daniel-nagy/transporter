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
const worker = new Worker("/worker.js", { type: "module" });
const client = BrowserClient.from(worker);
const response = await client.fetch("👋");
```

### BrowserRequest

<sup>_Module_</sup>

###### Types

- [Request](#Request)

###### Functions

- [isRequest](#IsRequest)

### BrowserResponse

<sup>_Module_</sup>

###### Types

- [Response](#Response)

###### Functions

- [isResponse](#IsResponse)

### BrowserServer

<sup>_Module_</sup>

###### Types

- [BrowserServer](#BrowserServer)
- [Options](#Options)
- [RequestHandler](#RequestHandler)
- [State](#State)

###### Constructors

- [listen](#listen)

###### Methods

- [stop](#Stop)

### BrowserSocket

<sup>_Module_</sup>

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
