# Core

The core package contains APIs designed to work in any JavaScript runtime.

```
npm add @daniel-nagy/transporter
```

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

<sup>_Module_</sup>

<sup>**Types**</sup>

<sup>
  <ul>
    <li><a href="#BehaviorSubject">BehaviorSubject</a></li>
  </ul>
</sup>

<sup>**Constructors**</sup>

<sup>
  <ul>
    <li><a href="#Of">of</a></li>
  </ul>
</sup>

<sup>**Methods**</sup>

<sup>
  <ul>
    <li><a href="#GetValue">getValue</a></li>
  </ul>
</sup>

#### BehaviorSubject

<sup>_Type_</sup>

```ts
class BehaviorSubject<T> extends Subject<T> {}
```

A `BehaviorSubject` is a Subject that replays the most recent value when subscribed to.

#### Of

<sup>_Constructor_</sup>

```ts
function of<T>(value: T): BehaviorSubject<T>;
```

Creates a new `BehaviorSubject` with an initial value of type `T`.

##### Example

```ts
import * as BehaviorSubject from "@daniel-nagy/transporter/BehaviorSubject";

BehaviorSubject.of("👍").subscribe(console.log);
```

#### GetValue

<sup>_Method_</sup>

```ts
getValue(): T;
```

The `getValue` method can be used to synchronously retrieve the value held by the `BehaviorSubject`. If the `BehaviorSubject` is in an error state then `getValue` will throw the error.

##### Example

```ts
import * as BehaviorSubject from "@daniel-nagy/transporter/BehaviorSubject";

BehaviorSubject.of("👍").getValue();
```

### Cache

<sup>_Module_</sup>

<sup>**Types**</sup>

<sup>
  <ul>
    <li><a href="#Cache">Cache</a></li>
  </ul>
</sup>

<sup>**Constructors**</sup>

<sup>
  <ul>
    <li><a href="#Init">init</a></li>
  </ul>
</sup>

<sup>**Methods**</sup>

<sup>
  <ul>
    <li><a href="#Add">add</a></li>
    <p></p>
    <li><a href="#Get">get</a></li>
    <p></p>
    <li><a href="#Has">has</a></li>
    <p></p>
    <li><a href="#Memo">memo</a></li>
    <p></p>
    <li><a href="#Remove">remove</a></li>
    <p></p>
    <li><a href="#Update">update</a></li>
  </ul>
</sup>

#### Cache

<sup>_Type_</sup>

```ts
class Cache {}
```

A `Cache` may be used to memoize remote function calls. Transporter guarantees that proxies are referentially stable so other memoization APIs are likely compatible with Transporter as well.

In order to memoize a function its arguments must be serializable. A stable algorithm is used to serialize a function's arguments and index the cache. The Cache supports any arguments of type `SuperJson`.

#### Init

<sup>_Constructor_</sup>

```ts
function init(): Cache;
```

Creates a new `Cache`.

##### Example

```ts
import * as Cache from "@daniel-nagy/transporter/Cache";

const cache = Cache.init();
```

#### Add

<sup>_Method_</sup>

```ts
add(func: JsFunction.t, args: SuperJson.t[], value: unknown): void;
```

Adds the value to the cache for the specified function and arguments. Used internally by the `memo` method, which is the preferred way to add a value to the cache.

##### Example

```ts
import * as Cache from "@daniel-nagy/transporter/Cache";

const identity = (value) => value;

Cache.init().add(identity, "🥸", "🥸");
```

#### Get

<sup>_Method_</sup>

```ts
get<Args extends SuperJson.t[], Return>(
  func: (...args: Args) => Return,
  args: Args
): Return | NotFound;
```

Get a value from the cache. Returns `NotFound` if the value does not exist.

##### Example

```ts
import * as Cache from "@daniel-nagy/transporter/Cache";

const identity = (value) => value;

Cache.init().get(identity, "🥸"); // NotFound
```

#### Has

<sup>_Method_</sup>

```ts
has(func: JsFunction.t, args?: SuperJson.t[]): boolean
```

Checks if the value is in the cache. If no arguments are provided it will return `true` if any value is cached for the function.

##### Example

```ts
import * as Cache from "@daniel-nagy/transporter/Cache";

const identity = (value) => value;

Cache.init().has(identity, "🥸"); // false
```

#### Memo

<sup>_Method_</sup>

```ts
memo<Args extends SuperJson.t[], Return>(
  func: (...args: Args) => Return
): (...args: Args) => Return
```

Takes a function as input and returns a memoized version of the same function as output. This is the preferred way of adding values to the cache.

##### Example

```ts
import * as Cache from "@daniel-nagy/transporter/Cache";

const identity = (value) => value;
const cache = Cache.init();
const memo = Cache.memo(identity);
memo("🥸");
cache.has(identity, "🥸"); // true
```

#### Remove

<sup>_Method_</sup>

```ts
remove(func: JsFunction.t, args?: SuperJson.t[]): boolean
```

Removes a value from the cache. Returns `true` if the value was found and removed. If no arguments are provided then all values for that function will be removed.

##### Example

```ts
import * as Cache from "@daniel-nagy/transporter/Cache";

const identity = (value) => value;
const cache = Cache.init();
const memo = Cache.memo(identity);
memo("🥸");
cache.remove(identity, "🥸"); // true
```

#### Update

<sup>_Method_</sup>

```ts
update<Args extends SuperJson.t[], Return>(
  func: (...args: Args) => Return,
  args: Args,
  callback: (value: Return) => Return
): void
```

Updates a value in the cache. The callback function will receive the current value in the cache. The next function call will return the new value. Does nothing if there is a cache miss on the value.

##### Example

```ts
import * as Cache from "@daniel-nagy/transporter/Cache";

const identity = (value) => value;
const cache = Cache.init();
const memo = Cache.memo(identity);
memo("🥸");
cache.update(identity, "🥸", () => "🤓");
```

### Injector

<sup>_Module_</sup>

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
