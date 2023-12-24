# Core

The core package contains APIs designed to work in any JavaScript runtime.

Transporter is distributed as ES modules. Generally speaking, modules encapsulate a type and export functions that act as either a constructor or operator on that type. The module has the same name as the type it encapsulates. You will often see this type reexported with the alias `t`. This is a common convention found in functional programming languages that allows dereferencing the type from the module without typing out the name twice, which feels icky. This makes using namespace imports with Transporter modules a bit nicer. For example,

```typescript
import * as Observable from "@daniel-nagy/transporter/Observable";

// To access the type you need to type Observable twice 🤮.
const observable: Observable.Observable = Observable.of(1, 2, 3);

// Equivalent to the above. Not perfect but better.
const observable: Observable.t = Observable.of(1, 2, 3);
```

Transporter makes heavy use of namespace imports internally. If that makes you concerned about tree-shaking then don't be. Webpack, Rollup, and esbuild all handle namespace imports fine. It is namespace exports that may be problematic when it comes to tree-shaking. Though both webpack and Rollup seem to handle those as well, making esbuild the standout.

## API

Transporter contains the following modules.

- [BehaviorSubject](#BehaviorSubject)
- [Cache](#Cache)
- [Injector](#Injector)
- [Json](#Json)
- [Message](#Message)
- [Metadata](#Metadata)
- [Observable](#Observable)
- [Proxy](#Proxy)
- [PubSub](#Pubsub)
- [Session](#Session)
- [Subprotocol](#Subprotocol)
- [Subject](#Subject)
- [SuperJson](#Superjson)

### BehaviorSubject

The BehaviorSubject module represents a Subject that replays the most recent value when subscribed to.

#### Types

```ts
class BehaviorSubject<T> extends Subject<T> {
  getValue(): T
}
```

A `Subject` that replays the most recent value.

#### Constructors

```ts
function of<T>(value: T): BehaviorSubject<T>
```

Creates a new `BehaviorSubject` with an initial value of type `T`.

##### Example

```ts
import * as BehaviorSubject from "@daniel-nagy/transporter/BehaviorSubject";

BehaviorSubject
  .of("👍")
  .subscribe(console.log);
```

#### Methods

```ts
function BehaviorSubject<T>.getValue(): T
```

The `getValue` method can be used to synchronously retrieve the value held by the `BehaviorSubject`. If the `BehaviorSubject` is in an error state then `getValue` will throw the error.

##### Example

```ts
import * as BehaviorSubject from "@daniel-nagy/transporter/BehaviorSubject";

BehaviorSubject
  .of("👍")
  .getValue();
```

### Cache

The Cache module may be used to memoize remote function calls. Transporter guarantees that proxies are referentially stable so other memoization APIs are likely compatible with Transporter as well.

### Injector

The Injector module is used for dependency injection.

### Json

The Json module may be used as a subprotocol. If you are communicating between two JavaScript runtimes then you may use the [SuperJson](#Superjson) module for a better experience.

### Metadata

The Metadata module allows information to be extracted from a proxy.

### Observable

The Observable module provides [ReactiveX](https://reactivex.io/) APIs similar to [rxjs](https://rxjs.dev/). If you make heavy use of Observables then you may decide to use rxjs instead.

### Message

The Message module implements the Transporter message protocol.

### Session

The Session module is used to create Transporter sessions.

### Subprotocol

The Subprotocol module is used to provide typesafety on top of the Transporter protocol.

### Proxy

The Proxy module is used to create proxy objects. Transporter will proxy these objects instead of cloning them.

### PubSub

The PubSub module is used to wrap an Observable so that it may be used for pub/sub. A PubSub is essentially an Observable who's subscribe and unsubscribe methods are asynchronous.

### Subject

A Subject is both an Observable and an Observer. A Subject can be used to multicast an Observable.

### SuperJson

The SuperJson module extends the JSON protocol to include many built-in JavaScript types, including `Date`, `RegExp`, `Map`, ect.
