# Transporter

![](https://img.shields.io/endpoint?url=https%3A%2F%2Fblvd-corp-github-ci-artifacts.s3.amazonaws.com%2FBoulevard%2Ftransporter%2Fworkflows%2Fci%2Fcoverage-shield.json)

Transporter enables inter-process communication using remote method invocation. Semantically the Transporter API is used to create remote, or asynchronous, JavaScript modules. The Transporter API was influenced by [comlink](https://github.com/GoogleChromeLabs/comlink).

![image](https://user-images.githubusercontent.com/1622446/163908100-bb2f24e3-e393-43bf-a656-0e182da41a0e.png)

#### Contents

- [Introduction](#introduction)
- [API](#api)
  - [Functions](#functions)
  - [Types](#types)
- [Memory Management](#memory-management)

## Introduction

Transporter is an implementation of the RPC request-response protocol. Its goal is to replace low-level message passing with a more maintainable and productive API. To properly send, receive, and chain messages together can be deceivingly hard. It's also repetitive to implement over and over again. Transporter abstracts message passing into function calls so you can focus on code and not on boilerplate.

Without further ado let's look at an example. Suppose we have a worker that contains some reusable math functions and we want to use those math functions in our application.

```typescript
import { createModule } from "@boulevard/transporter";

const add = (...values) => values.reduce((sum, num) => sum + num, 0);
const subtract = (...values) => values.reduce((diff, num) => diff - num, 0);

createModule({ export: { add, subtract } });
```

Our worker code creates a module and exports 2 functions `add` and `subtract`.

```typescript
import { useModule } from "@boulevard/transporter";

const { add, subtract } = useModule({ from: new Worker("math.js") });

const main = async () => {
  await add(1, 2);
  await subtract(2, 1);
};

main();
```

Our application code requires this module by calling `useModule` on our worker. Notice when our application invokes a function exported by our worker it must `await` the response. When we invoke a function exported by our worker that function will be evaluated inside the worker. If we want the return value of the function we must wait for the result to be returned from the worker thread.

## API

### Functions

#### `createModule`

```typescript
createModule<T extends ModuleExports>({
  export: T,
  from: InternalMessageTarget = self,
  namespace: Nullable<string> = null
}): {
  release(): void
};
```

Create a new module and define its exports. The message target is optional and defaults to `self`. You may provide a namespace to avoid collision with other modules from the same message target. It is recommended to always namespace your modules.

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

#### `useModule`

```typescript
useModule<T extends ModuleExports>({
  from: ExternalMessageTarget,
  namespace: Nullable<string> = null,
  origin?: string,
  timeout: number = 1000,
  to: InternalMessageTarget = self
}): RemoteModule<T>;
```

Use a remote module from an external message target. The internal message target is optional and defaults to `self`. The namespace should match the namespace of the remote module.

Returns a remote module. A remote module may export functions or observables. Calling a remote function will return a promise.

> You know my fourth rule? Never make a promise you can't keep.

Whenever a response is required Transporter will send a message to the target to validate the connection. The message target must respond within the timeout limit. This validation is independent of the time it takes to fulfill the request. Once the connection is validated there is no time limit to fulfill the request.

##### Examples

```typescript
type Auth = {
  login(userName: string, password: string): { apiToken: string };
};

type Crypto = {
  encrypt(value: string): string;
};

const Auth = useModule<Auth>({
  from: self.parent,
  namespace: "Auth",
  origin: "https://trusted.com",
});

const Crypto = useModule<Crypto>({ from: new Worker("crypto.0beec7b.js") });

const { apiToken } = await Auth.login("chow", await Crypto.encrypt("bologna1"));
```

You can get the value of an observable imperatively using the `firstValueFrom` function exported by Transporter. It is advised to only use `firstValueFrom` if you are sure the observable will emit a value, otherwise your program may hang indefinitely.

```typescript
const { definitelyEmits } = useModule({ from: self.parent });
const value = await firstValueFrom(definitelyEmits);
```

You can subscribe to an observable to receive new values overtime.

```typescript
const { darkMode } = useModule({ from: self.parent });
darkMode.subscribe(onDarkModeChange);
```

### Types

#### `ExternalMessageTarget`

```typescript
interface ExternalMessageTarget {
  postMessage(message: string, origin?: string): void;
}
```

An external message target is any object with a `postMessage` method that supports a single argument of type `string`.

Internally Transporter will serialize and deserialize all transported values to and from JSON. While some message targets can send and receive types other than `string`, using strings enables interop with more systems. At the moment this is opaque but it would be possible to add an API to intercept messages and provide custom logic.

##### Example

```typescript
const Native = useModule({ from: window.ReactNativeWebView });
```

#### `InternalMessageTarget`

```typescript
interface InternalMessageTarget {
  addEventListener(
    type: "message",
    listener: (event: { data: string; source: ExternalMessageTarget }) => void
  ): void;
  removeEventListener(
    type: "message",
    listener: (event: { data: string; source: ExternalMessageTarget }) => void
  ): void;
}
```

An internal message target is any object that can receive message events. The message event must include the source of the message.

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

If a value cannot be serialized, such as a function, the value is proxied. However, if the proxy is garbage collected this would continue to hold a strong reference to the value, thus creating a memory leak. This module uses `FinalizationRegistry` to receive a notification when a proxy is garbage collected. When a proxy is garbage collected a message is sent to release the value, allowing it to be garbage collected as well.
