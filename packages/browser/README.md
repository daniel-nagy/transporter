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

###### Types

- [BroadcastSubject](#BroadcastSubject)

###### Constructors

- [fromChannel](#FromChannel)

### BrowserClient

<sup>_Module_</sup>

###### Types

- [BrowserClient](#BrowserClient)
- [Options](#Options)

###### Constructors

- [from](#From)

###### Methods

- [fetch](Fetch)

### BrowserRequest

<sup>_Module_</sup>

###### Types

- [Request](#Request)

###### Constructors

- [Request](#Request)

###### Functions

- [isRequest](#IsRequest)

### BrowserResponse

<sup>_Module_</sup>

###### Types

- [Response](#Response)

###### Constructors

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
