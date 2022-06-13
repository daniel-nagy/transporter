# Transporter

![](https://img.shields.io/endpoint?url=https%3A%2F%2Fblvd-corp-github-ci-artifacts.s3.amazonaws.com%2FBoulevard%2Ftransporter%2Fworkflows%2Fci%2Fcoverage-shield.json)

Transporter is a framework for inter-process communication. The Transporter API was influenced by [comlink](https://github.com/GoogleChromeLabs/comlink), [OIS](https://en.wikipedia.org/wiki/OSI_protocols), [OpenRPC](https://github.com/open-rpc), and [rxjs](https://github.com/ReactiveX/rxjs).

![image](https://user-images.githubusercontent.com/1622446/163908100-bb2f24e3-e393-43bf-a656-0e182da41a0e.png)

#### Contents

- [Introduction](#introduction)
- [Install](#install)
- [API](#api)
  - [Functions](#functions)
  - [Types](#types)
- [Memory Management](#memory-management)
- [Examples](#examples-2)

## Introduction

Transporter simplifies the implementation of inter-process communication. It provides structure on top of primitive message passing that improves semantics, maintenance, and productivity so you can focus on code and not on boilerplate.

Let's look at an example. Suppose we have a worker that contains some reusable math functions and we want to use those math functions in our application. First let's look at the worker code.

```typescript
import { createServer, createService } from "@boulevard/transporter";
import { createSessionManager } from "@boulevard/transporter/worker";

const add = (...values) => values.reduce((sum, num) => sum + num, 0);

const subtract = (value, ...values) =>
  values.reduce((diff, num) => diff - num, value);

const math = createService({ add, subtract });

createServer({
  router: [{ path: "math", provide: math }],
  scheme: "blvd",
  sessionManagers: [createSessionManager()],
});
```

Our worker creates a math service as well as a server that can accept incoming requests and route them to the math service. Next let's look at how our application uses this service.

```typescript
import { createSession } from "@boulevard/transporter/worker";

const { link } = createSession(new Worker("math.js", { type: "module" }));
const { add, subtract } = link("blvd:math");

const main = async () => {
  const sum = await add(1, 2);
  const diff = await subtract(2, 1);
};

main();
```

Our application establishes a connection to the worker and then links the math service using a URI. Notice when our application calls a function provided by the math service it must `await` the response. When we call a function provided by the math service that function will be evaluated inside the worker. If we want the return value of the function we must wait for the result to be returned from the worker thread.

## Install

Transporter is available from the npm registry.

> Transporter is currently in beta. Expect breaking API changes.

```
npm add @boulevard/transporter
```

## API

### Functions

#### `createClient`

```typescript
function createClient(from: { port: SessionPort; timeout?: number }): Client;
```

Creates a client that is able to link to services.

> You know my fourth rule? Never make a promise you can't keep. — Frank

Whenever a response is required Transporter will send a message to the server to validate the connection. The server must respond within the timeout limit. This validation is independent of the time it takes to fulfill the request. Once the connection is validated there is no time limit to fulfill the request.

#### `createServer`

```typescript
function createServer(from: {
  router: Router;
  scheme: string;
  sessionManagers: [SessionManager, ...SessionManager[]];
  timeout?: number;
}): Server;
```

Creates a server that can manage client sessions and route incoming requests to the correct service. Transporter is connection-oriented and transport agnostic. However, a duplex transport is required to support observables and callback arguments.

The scheme is similar to custom URL schemes on iOS and Android. The scheme acts as a namespace. It is used to disambiguate multiple servers running on the same host.

#### `createService`

```typescript
function createService<T extends ServiceAPI>(provide: T): Service;
```

Creates a service. Services may provide functions or observables. Functions act as a pull mechanism and observables act as a push mechanism. If a service provides a value that is not an observable it will be wrapped in an observable that emits the value and then completes.

##### Examples

```typescript
const list = createService({ concat: (left, right) => [...left, ...right] });
const string = createService({ concat: (left, right) => `${left}${right}` });

createServer({
  router: [
    { path: "list", provide: list },
    { path: "string", provide: string },
  ],
  scheme: "blvd",
  sessionManagers: [createSessionManager()],
});
```

Pub/Sub communication is possible using observables.

```typescript
const darkMode = new BehaviorSubject(false);
createService({ darkMode: darkMode.asObservable() });
darkMode.next(true);
```

The client can get the value of an observable imperatively using the `firstValueFrom` function exported by Transporter. It is advised to only use `firstValueFrom` if you know the observable will emit a value, otherwise your program may hang indefinitely.

```typescript
const { definitelyEmits } = session.link("org:example");
const value = await firstValueFrom(definitelyEmits);
```

The client can subscribe to an observable to receive new values overtime.

```typescript
const { darkMode } = session.link("org:client/preferences");
darkMode.subscribe(onDarkModeChange);
```

### Types

#### `Client`

```typescript
type Client = {
  link<T extends ServiceAPI>(uri: string): RemoteService<T>;
};
```

A client is connected to a host. A client is able to link to services provided by a server running on the host.

##### Example

```typescript
import { createSession as createBrowserSession } from "@boulevard/transporter/browser";
import { createSession as createWorkerSession } from "@boulevard/transporter/worker";

const browserSession = createBrowserSession({
  origin: "https://trusted.com",
  window: self.parent,
});

const workerSession = createWorkerSession(new Worker("crypto.0beec7b.js"));

type Auth = {
  login(userName: string, password: string): { apiToken: string };
};

type Crypto = {
  encrypt(value: string): string;
};

const auth = browserSession.link<Auth>("blvd:auth");
const crypto = workerSession.link<Crypto>("blvd:crypto");

const { apiToken } = await auth.login("chow", await crypto.encrypt("bologna1"));
```

#### `RemoteService`

```typescript
type RemoteService = {
  [name: string]: ObservableLike<Transported> | TransportedFunction;
};
```

A remote service is a group of remote functions or observables. It is a service but from a client's perspective. While a remote service looks like an object it does not have an object's prototype. You can think of it as an object with a `null` prototype. Notably the remote service's properties are not iterable.

#### `Router`

```typescript
type Router = { path: string; provide: Service }[];
```

A router is a data structure for mapping paths to services.

#### `Server`

```typescript
export type Server = {
  stop(): void;
};
```

A server is able to accept connections from clients and route incoming requests to the correct service.

#### `Service`

```typescript
export type Service = {
  [name: string]: ObservableLike<Transportable> | TransportableFunction;
};
```

A service is a group of functions or observables. A service can be thought of as a secondary router.

#### `SessionManager`

```typescript
export type SessionManager = {
  connect: ObservableLike<SessionPort>;
};
```

A session manager is the glue between a server and a client. It is responsible for monitoring incoming requests and creating a connection between the server and the client.

A session manager sits between the server and the transport layer. Transporter provides session managers for browser windows, Web workers, React Native, and React Native Webviews. However, it is possible to create your own session managers. This allows Transporter to be agnostic of the transport layer. Keep in mind that callback arguments and observables do require a duplex transport layer though.

##### Example

```typescript
createServer({
  ...,
  sessionManagers: [
    createBrowserSessionManager(),
    createWebViewSessionManager()
  ]
});
```

The session manager factory functions provided by Transporter allow you to intercept the connection before it is created. This enables proxying the session port or rejecting the connection. To prevent the connection from being created return `null` from the `connect` function.

```typescript
createBrowserSessionManager({
  ...,
  connect({ delegate, origin }) {
    return new URL(origin).hostname.endsWith("trusted.com") ? delegate() : null;
  }
});
```

#### `SessionPort`

```typescript
type SessionPort = {
  receive: ObservableLike<string>;
  send(message: string): void;
};
```

A session port represents a connection between a server and a client.

#### `Transportable`

```typescript
type Transportable =
  | boolean
  | null
  | number
  | string
  | undefined
  | Transportable[]
  | { [key: string]: Transportable }
  | (...args: Transported[]) => (Transportable | Promise<Transportable>);
```

A transportable value may be transported between processes. If the value is serializable it will be cloned. If it is not serializable it will be proxied. If the return value of a function is a promise then the response will be sent once the promise settles.

## Memory Management

If a value cannot be serialized, such as a function, the value is proxied. However, if the proxy is garbage collected this would continue to hold a strong reference to the value, thus creating a memory leak. Transporter uses `FinalizationRegistry` to receive a notification when a proxy is garbage collected. When a proxy is garbage collected a message is sent to release the value, allowing it to be garbage collected as well.

## Examples

### Composing React Apps

Transporter can be used to easily compose React applications in iframes or React Native Webviews. Here is an example app that has a reusable `<MicroApp />` component that renders a React app that provides an app service with a `render` method inside an iframe.

```tsx
import { createSession } from "@boulevard/transporter/browser";
import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";

const MicroApp = <T,>({ src, uri, ...props }: MicroApp.Props<T>) => {
  const [app, setApp] = useState(null);

  const onLoad = ({ currentTarget: frame }) =>
    setApp(() => createSession(frame.contentWindow).link(uri));

  useEffect(() => {
    app?.render(props);
  });

  return <iframe onLoad={onLoad} src={src} />;
};

const App = () => {
  const [count, setCount] = useState(0);

  return (
    <MicroApp<CounterProps>
      count={count}
      increment={() => setCount((count) => count + 1)}
      src="./counter.html"
      uri="counter:app"
    />
  );
};

createRoot(document.getElementById("root")).render(<App />);
```

Notice that we called `setApp` with a function, otherwise React would attempt to call our service as a function.

And here is the implementation of the micro app.

```tsx
import { createServer, createService } from "@boulevard/transporter";
import { createSessionManager } from "@boulevard/transporter/browser";
import { createRoot } from "react-dom/client";

const App = ({ count, increment }) => (
  <>
    <div>current count: {count}</div>
    <button onClick={() => increment()}>increment</button>
  </>
);

const Root = createRoot(document.getElementById("root"));

const app = createService({
  render: (props) => Root.render(<App {...props} />),
});

createServer({
  router: [{ path: "app", provide: app }],
  scheme: "counter",
  sessionManagers: [createSessionManager()],
});
```

Notice that we provide an inline function to `onClick` that calls `increment` with no arguments. Otherwise the click event would be passed to `increment` which is not transportable.
