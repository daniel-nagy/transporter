# Transporter

![](https://img.shields.io/endpoint?url=https%3A%2F%2Fblvd-corp-github-ci-artifacts.s3.amazonaws.com%2FBoulevard%2Ftransporter%2Fworkflows%2Fci%2Fcoverage-shield.json)

Transporter enables inter-process communication using remote method invocation in JavaScript. The Transporter API was influenced by [comlink](https://github.com/GoogleChromeLabs/comlink).

![image](https://user-images.githubusercontent.com/1622446/163908100-bb2f24e3-e393-43bf-a656-0e182da41a0e.png)

#### Contents

- [Thesis](#thesis)
- [API](#api)
  - [Functions](#functions)
  - [Types](#types)
- [Memory Management](#memory-management)

## Thesis

Transporter is an implementation of the RPC request-response protocol. Its goal is to replace low-level message passing with a more maintainable and productive API. To properly send, receive, and chain messages together can be deceivingly hard. It's also repetitive to implement over and over again. Transporter abstracts message passing into function calls so you can focus on code and not on boilerplate.

Without wasting anymore time let's look at an example of what Transporter can do. Suppose we want to expose a function to an external message target. This could be an iframe, web worker, web view, or any object that implements the [`ExternalMessageTarget`](#externalmessagetarget) interface. This function takes a callback function and returns a new function.

```typescript
import { expose } from "@boulevard/transporter";

const schedule = (interval, callback) => {
  const startTime = date.now();
  const id = setInterval(interval, () =>
    callback(date.now() - interval - startTime)
  );

  return () => clearInterval(id);
};

const childFrame = document.body.appendChild(
  Object.assign(document.createElement("iframe"), {
    src: "https://example.com"
  })
);

expose({ value: { schedule }, to: childFrame.contentWindow });
```

```typescript
import { createProxy } from "@boulevard/transporter";

const proxy = createProxy({ from: self.parent });
const stop = await proxy.schedule(100, lapsedTime => console.log(lapsedTime));

setTimeout(stop, 1000);
```

In this example we created a function called `schedule` and we exposed it to an iframe. This function takes an interval and a callback as arguments and calls the callback function at the specified interval, providing the lapsed time as an argument to the callback function. This function also returns a function to stop the timer. The `schedule` and `stop` functions exist in the parent frame's address space and the callback function exists in iframe's address space. This may not seem like a very practical example but it does demonstrate the power of Transporter. If you're not convinced try implementing this same behavior with only `postMessage`. Keep in mind that the iframe may want to schedule multiple tasks 😉.

## API

### Functions

#### `expose`

```typescript
expose<T>({
  value: T,
  from: InternalMessageTarget = self,
  to: ExternalMessageTarget,
  scope: Nullable<string> = null
}): {
  stop(): void
};
```

Exposes a value from an internal message target to an external message target. The value must be [`Exposeable`](#exposable). The internal message target is optional and defaults to `self`.

You may provide a scope to avoid collision with other exposed values from the same message target. Only one value can be exposed per message target per scope. To expose multiple values from a single scope use an object who's keys are the values you want to expose. Stop exposing a value from an already acquired scope before exposing a new value from the same scope. You may mutate the properties of an exposed object at anytime.

Returns a function that may be called to stop exposing the value.

##### Example

```typescript
expose({ value: "❤️", to: self.parent });
expose({ value: 8675309, to: self.parent });
expose({ value: { catsAreBetterThanDogs: true }, to: self.parent });
expose({ value: { movies: ["Ant-Man", "Guardians of the Galaxy", "Captain Marvel"] }, to: self.parent })
expose({ value: { blondie: callMe => callMe("any time") }, to: self.parent });
expose({ value: { feedMe: () => "cat food" }, to: self.parent, scope: "Snowball" });
expose({ value: { feedMe: () => "dog food", } to: self.parent, scope: "Rufus" });

const { stop } = expose({ value: "🔨⏰", to: self.parent });
stop();
```

#### `createProxy`

```typescript
createProxy<T>({
  from: ExternalMessageTarget,
  to: InternalMessageTarget = self,
  scope: Nullable<string> = null,
  timeout: number = 1000
}): Remote<T>;
```

Proxy a remote value from an external message target. The internal message target is optional and defaults to `self`. The scope should match the scope of the exposed value.

The returned proxy is essentially a lazy promise. In other words, you won't have the value from the other side just yet. To get the value from the other side you need to force the promise to resolve. This can be done using the `await` syntax or the `.then` method. If you dereference a property of an object or an item in an array, without forcing the promise to resolve, you will get a new proxy.

You can call functions as if they were local. Calling a remote function will return a promise.

> You know my fourth rule? Never make a promise you can't keep.

Whenever a response is required an acknowledgement of the request must be received within the allowed time limit. This is handled automatically by Transporter. This acknowledgement is independent of the time it takes to fulfill the request. Once the acknowledgement is received there is no time limit to fulfill the request. You may wrap the promise in your own timeout if you'd like.

##### Example

```typescript
const proxy = createProxy<string>({ from: self.parent });
const value = await proxy;

const proxy = createProxy<() => number>({ from: self.parent });
const value = await proxy();

const proxy = createProxy<{ feedMe(): string }>({ from: self.parent, scope: "Rufus" });
const value = await proxy.feedMe();

const proxy = createProxy<((callback: (value: number) => void): void)>({ from: self.parent });
proxy(num => console.log(`the number is ${num}`));
```

### Types

#### `ExternalMessageTarget`

```typescript
interface ExternalMessageTarget {
  postMessage(message: string): void;
}
```

An external message target is any object with a `postMessage` method that requires a single argument of type `string`.

Internally Transporter will serialize and deserialize all transported values to and from JSON. While some message targets can send and receive types other than `string`, using strings enables interop with more systems. At the moment this is opaque but it would be possible to add an API to intercept messages and provide custom logic.

##### Example

```typescript
expose({ value: "🥸", to: window.ReactNativeWebView });
```

#### `InternalMessageTarget`

```typescript
interface InternalMessageTarget {
  addEventListener(
    type: "message",
    listener: (event: { data: string }) => void
  ): void;
  removeEventListener(
    type: "message",
    listener: (event: { data: string }) => void
  ): void;
}
```

An internal message target is any object that can receive message events.

#### `Exposable`

```typescript
type Exposable =
  | undefined
  | null
  | boolean
  | number
  | string
  | Exposable[]
  | { [key: string]: Exposable }
  | (...args: Exposable[]): Exposable | Promise<Exposable>
```

An exposable value may be exposed to a message target. If the value is transferable it will be cloned on request. If it is not transferable it will be proxied on request. If the exposed value is a promise then the response will be sent once the promise settles.

> It would be possible to expose more types. For example, it would be possible to expose regular expressions or even classes. It may also be possible to expose custom types.

#### `RemoteValue`

```typescript
type RemoteValue = LazyPromise<Exposable>;
```

A remote value is a lazy promise for an exposed value.

## Memory Management

If an exposed value cannot be cloned, such as a function, it is exposed using the `expose` function and a proxy is created on the other side for the exposed value. However, if the proxy is garbage collected this would continue to hold a strong reference to the exposed value, thus creating a memory leak. This module uses `FinalizationRegistry` to receive a notification when a proxy is garbage collected. When a proxy is garbage collected a message is sent to the other side to stop exposing the value, allowing it to be garbage collected as well.
