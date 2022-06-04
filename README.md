# Transporter

![](https://img.shields.io/endpoint?url=https%3A%2F%2Fblvd-corp-github-ci-artifacts.s3.amazonaws.com%2FBoulevard%2Ftransporter%2Fworkflows%2Fci%2Fcoverage-shield.json)

Transporter enables inter-process communication using remote method invocation. Semantically the Transporter API is used to create remote, or asynchronous, JavaScript modules. The Transporter API was influenced by [comlink](https://github.com/GoogleChromeLabs/comlink).

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

Transporter is an implementation of the RPC request-response protocol. Its goal is to replace low-level message passing with a more maintainable and productive API. To properly send, receive, and chain messages together can be deceivingly hard. It's also repetitive to implement over and over again. Transporter abstracts message passing into function calls so you can focus on code and not on boilerplate.

Without further ado let's look at an example. Suppose we have a worker that contains some reusable math functions and we want to use those math functions in our application.

```typescript
import { createModule } from "@boulevard/transporter";

const add = (...values) => values.reduce((sum, num) => sum + num, 0);

const subtract = (value, ...values) =>
  values.reduce((diff, num) => diff - num, value);

createModule({ export: { add, subtract } });
```

Our worker code creates a module and exports 2 functions `add` and `subtract`.

```typescript
import { linkModule } from "@boulevard/transporter";

const { add, subtract } = linkModule({
  from: new Worker("math.js", { type: "module" }),
});

const main = async () => {
  await add(1, 2);
  await subtract(2, 1);
};

main();
```

Our application code links this module by calling `linkModule` on our worker. Notice when our application invokes a function exported by our worker it must `await` the response. When we invoke a function exported by our worker that function will be evaluated inside the worker. If we want the return value of the function we must wait for the result to be returned from the worker thread.

## Install

Transporter is available from the npm registry.

> Transporter is currently in beta. Expect breaking API changes.

```
npm add @boulevard/transporter
```

## API

### Functions

#### `createModule`

```typescript
createModule<T extends ModuleExports>({
  export: T,
  namespace: Nullable<string> = null,
  timeout: number = 1000,
  using: MessageGateway = defaultMessageGateway
}): {
  release(): void
};
```

Create a new module and define its exports. Modules can be linked using 1 or more message gateways. See the [`MessageGateway`](#messagegateway) type for more info. You may provide a namespace to avoid collision with other modules using the same message gateway. It is recommended to always namespace your modules.

Module exports should be considered final. You can use observables to export values that may change overtime. All exports must be named. Anonymous default exports are not allowed. If an exported value is neither a function nor an observable it will be wrapped in an observable that emits the value and then completes.

Returns a function to release the module so that its exports may be garbage collected. You may reuse the namespace of a module after it has been released.

##### Examples

```typescript
createModule({ export: { default: "❤️" } });
createModule({ export: { phoneNumber: 8675309 } });
createModule({ export: { catsAreBetterThanDogs: true } });
createModule({
  export: { movies: ["Ant-Man", "Guardians of the Galaxy", "Captain Marvel"] },
});
createModule({
  export: { forEach: (list, callback) => list.forEach(callback) },
});
createModule({
  export: { concat: (left, right) => [...left, ...right] },
  namespace: "List",
});
createModule({
  export: { concat: (left, right) => `${left}${right}` },
  namespace: "String",
});

const { release } = createModule({ export: { default: "aloha" } });
release();
```

Live exports can be created using observables.

```typescript
const darkMode = new BehaviorSubject(false);
createModule({ export: { darkMode: darkMode.asObservable() } });
darkMode.next(true);
```

#### `linkModule`

```typescript
linkModule<T extends ModuleExports>({
  from: MessagePortLike,
  namespace: Nullable<string> = null,
  timeout: number = 1000
}): RemoteModule<T>;
```

Link a remote module using a message channel. The namespace should match the namespace of the remote module.

Returns a remote module. A remote module may export functions or observables. Calling a remote function will return a promise.

> You know my fourth rule? Never make a promise you can't keep. — Frank

Whenever a response is required Transporter will send a message to the target to validate the connection. The message target must respond within the timeout limit. This validation is independent of the time it takes to fulfill the request. Once the connection is validated there is no time limit to fulfill the request.

##### Examples

```typescript
type Auth = {
  login(userName: string, password: string): { apiToken: string };
};

type Crypto = {
  encrypt(value: string): string;
};

const Auth = linkModule<Auth>({
  from: browserChannel({
    origin: "https://trusted.com",
    window: self.parent,
  }),
  namespace: "Auth",
});

const Crypto = linkModule<Crypto>({ from: new Worker("crypto.0beec7b.js") });

const { apiToken } = await Auth.login("chow", await Crypto.encrypt("bologna1"));
```

You can get the value of an observable imperatively using the `firstValueFrom` function exported by Transporter. It is advised to only use `firstValueFrom` if you are sure the observable will emit a value, otherwise your program may hang indefinitely.

```typescript
const { definitelyEmits } = linkModule({ from: browserChannel(self.parent) });
const value = await firstValueFrom(definitelyEmits);
```

You can subscribe to an observable to receive new values overtime.

```typescript
const { darkMode } = linkModule({ from: browserChannel(self.parent) });
darkMode.subscribe(onDarkModeChange);
```

### Types

#### `MessagePortLike`

```typescript
type MessagePortLike = {
  addEventListener(type: "message", listener: MessageSubscriber): void;
  postMessage(message: string): void;
  removeEventListener(type: "message", listener: MessageSubscriber): void;
};
```

A message port is a private connection between 2 message targets. Because the connection is private the source of the message is implied.

Internally Transporter will serialize and deserialize all transported values to and from JSON. While some message targets can send and receive types other than `string`, using strings enables interop with more systems. At the moment this is opaque but it would be possible to add an API to intercept messages and provide custom logic.

#### `MessageGateway`

```typescript
type MessageGateway = (onConnect: (port: MessagePortLike) => void) => void;
```

A message gateway is responsible for linking modules. This allows Transporter to be agnostic of how the channel is created since Transporter cannot possibly know how every message channel is created.

Transporter provides some useful message gateways for browser windows, shared Web workers, and React Native. However, it is possible to create your own message gateways. For example, you could create an HTTP gateway or a Websocket gateway.

Every module is connected via 1 or more message gateways. If you do not specify a message gateway then the default message gateway is used. The default message gateway treats the global scope as a message port. Because the global scope of a dedicated Web worker behaves like a message port the default message gateway works with Web workers.

##### Example

```typescript
createModule({ export: { default: "👾" }, using: browserGateway() });
createModule({ export: { default: "🛸" }, using: sharedWorkerGateway() });
createModule({ export: { default: "⚛️" }, using: webViewGateway() });
```

The message gateways provided by Transporter allow you to intercept the connection before it is created. This could be useful for proxying the message port or rejecting connections from an unknown origin. To prevent the connection from being created return `null` from the `connect` function.

```typescript
createModule({
  export: { default: "👾" },
  using: browserGateway({
    connect({ delegate, origin }) {
      return new URL(origin).hostname.endsWith("trusted.com")
        ? delegate()
        : null;
    },
  }),
});
```

#### `Transportable`

```typescript
type Transportable =
  | boolean
  | null
  | number
  | string
  | Transportable[]
  | { [key: string]: Transportable }
  | (...args: Transported[]): Transportable | Promise<Transportable>
  | undefined
```

A transportable value may be transported between message targets. If the value is serializable it will be cloned. If it is not serializable it will be proxied. If the return value of a function is a promise then the response will be sent once the promise settles.

#### `RemoteValue`

```typescript
type RemoteValue = RemoteFunction | Observable;
```

A remote value is a function or an observable.

## Memory Management

If a value cannot be serialized, such as a function, the value is proxied. However, if the proxy is garbage collected this would continue to hold a strong reference to the value, thus creating a memory leak. Transporter uses `FinalizationRegistry` to receive a notification when a proxy is garbage collected. When a proxy is garbage collected a message is sent to release the value, allowing it to be garbage collected as well.

## Examples

### Composing React Apps

Transporter can be used to easily compose React applications in iframes or React Native Webviews. Here is an example app that has a reusable `<MicroApp />` component that renders a React app that exports a `render` method inside an iframe.

```tsx
import { linkModule } from "@boulevard/transporter";
import { browserChannel } from "@boulevard/transporter/browser";
import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";

const MicroApp = <T,>({ namespace, src, ...props }: MicroApp.Props<T>) => {
  const [App, setApp] = useState(null);

  const onLoad = ({ currentTarget: frame }) =>
    setApp(() =>
      linkModule({ from: browserChannel(frame.contentWindow), namespace })
    );

  useEffect(() => {
    App?.render(props);
  });

  return <iframe onLoad={onLoad} src={src} />;
};

const App = () => {
  const [count, setCount] = useState(0);

  return (
    <MicroApp<CounterProps>
      count={count}
      increment={() => setCount((count) => count + 1)}
      namespace="CounterApp"
      src="./counter.html"
    />
  );
};

createRoot(document.getElementById("root")).render(<App />);
```

Notice that we called `setApp` with a function that returns our module. Otherwise React would attempt to call our module as a function.

And here is the implementation of the micro app.

```tsx
import { createModule } from "@boulevard/transporter";
import { browserGateway } from "@boulevard/transporter/browser";
import { createRoot } from "react-dom/client";

const App = ({ count, increment }) => (
  <>
    <div>current count: {count}</div>
    <button onClick={() => increment()}>increment</button>
  </>
);

const Root = createRoot(document.getElementById("root"));
const render = (props) => Root.render(<App {...props} />);

createModule({
  export: { render },
  namespace: "CounterApp",
  using: browserGateway(),
});
```

Notice that we provide an inline function to `onClick` that calls `increment` with no arguments. Otherwise the click event would be passed to `increment` which is not transportable.
