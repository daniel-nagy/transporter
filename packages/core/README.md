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

###### Types

- [BehaviorSubject](#BehaviorSubject)

###### Constructors

- [of](#Of)

###### Methods

- [getValue](#GetValue)

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

###### Types

- [Cache](#Cache)

###### Constructors

- [init](#Init)

###### Methods

- [add](#Add)
- [get](#Get)
- [has](#Has)
- [memo](#Memo)
- [remove](#Remove)
- [update](#Update)

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

###### Types

- [Injector](#Injector)
- [Tag](#Tag)

###### Constructors

- [empty](#Empty)
- [Tag](#Tag)

###### Methods

- [add](#Add)
- [get](#Get)

###### Functions

- [getTags](#GetTags)
- [provide](#Provide)

#### Injector

<sup>_Type_</sup>

```ts
class Injector {}
```

An `Injector` is a dependency container. Values may be added or read from the container using tags.

#### Tag

<sup>_Type_<sup>

```ts
type Tag<Value> {}
```

A `Tag` is a value that is bound to a single dependency type and is used to index the container.

#### Empty

<sup>_Constructor_</sup>

```ts
function empty(): Injector;
```

Creates a new empty `Injector`.

##### Example

```ts
import * as Injector from "@daniel-nagy/transporter/Injector";

const injector = Injector.empty();
```

#### Tag

<sup>_Constructor_</sup>

```ts
function Tag<T>(): Tag<T>;
```

Creates a new `Tag`.

##### Example

```ts
import * as Injector from "@daniel-nagy/transporter/Injector";

type Session = {
  userId?: string;
};

const SessionTag = Injector.Tag<Session>();
```

#### Add

<sup>_Method_</sup>

```ts
function add<Value>(tag: Tag<Value>, value: Value): Injector;
```

Adds a value to the container.

##### Example

```ts
import * as Injector from "@daniel-nagy/transporter/Injector";

type Session = {
  userId?: string;
};

const SessionTag = Injector.Tag<Session>();
const Session: Session = { userId: "User_123" };
Injector.empty().add(SessionTag, Session);
```

#### Get

<sup>_Method_</sup>

```ts
function get(tag: Tag<unknown>): unknown;
```

Gets a value from the container using a `Tag`.

##### Example

```ts
import * as Injector from "@daniel-nagy/transporter/Injector";

const tag = Injector.Tag<string>();
Injector.empty().get(tag);
```

#### GetTags

<sup>_Function_</sup>

```ts
function getTags(func: JsFunction.t): : Tag<unknown>[];
```

Returns a list of tags from a function returned by `provide`. If the function does not have DI metadata an empty list is returned.

##### Example

```ts
import * as Injector from "@daniel-nagy/transporter/Injector";

const getUser = Injector.provide([Prisma, Session], (prisma, session) =>
  prisma.user.findUnique({ where: { id: session.userId } })
);

Injector.getTags(getUser);
```

#### Provide

<sup>_Function_</sup>

```ts
function provide<
  const Tags extends readonly Tag<unknown>[],
  const Args extends [...Values<Tags>, ...unknown[]],
  const Return
>(
  tags: Tags,
  func: (...args: Args) => Return
): (...args: JsArray.DropFirst<Args, JsArray.Length<Tags>>) => Return;
```

Returns a new function that has a list of tags stored as metadata. The call signature of the new function will omit any injected dependencies.

##### Example

```ts
import * as Injector from "@daniel-nagy/transporter/Injector";

const getUser = Injector.provide([Prisma, Session], (prisma, session) =>
  prisma.user.findUnique({ where: { id: session.userId } })
);
```

### Json

<sup>_Module_</sup>

The Json module may be used as a subprotocol. If you are communicating between two JavaScript runtimes then you may use the [SuperJson](#Superjson) module for a better experience.

###### Types

- [Json](#Json)

###### Functions

- [serialize](#Serialize)
- [sortDeep](#SortDeep)

#### Json

<sup>_type_</sup>

```ts
export type Json =
  | null
  | number
  | string
  | boolean
  | { [key: string]: Json }
  | Json[];
```

Represents a JSON value.

#### Serialize

```ts
function serialize(value: Json): string;
```

Serializes a JSON value in a way that is deterministic, such that 2 strings are equal if they encode the same value.

##### Example

```ts
import * as Json from "@daniel-nagy/transporter/Json";

Json.serialize({ name: "Jane Doe" });
```

#### sortDeep

```ts
function sortDeep(value: Json): Json;
```

Recursively sorts the properties of an object. Array values retain their sort order.

##### Example

```ts
import * as Json from "@daniel-nagy/transporter/Json";

Json.sortDeep({
  c: "c",
  b: [{ f: "f", e: "e" }, 12],
  a: "a"
});

// $ExpectType
// {
//   a: "a",
//   b: [{ e: "e", f: "f" }, 12],
//   c: "c"
// }
```

### Message

<sup>_Module_</sup>

The Message module implements the Transporter message protocol. The creation and interpretation of messages should be considered internal. However, it is ok to intercept message and perform your own logic or encoding.

###### Types

- [CallFunction](#CallFunction)
- [Error](#Error)
- [GarbageCollect](#GarbageCollect)
- [Message](#Message)
- [SetValue](#SetValue)
- [Type](#Type)
- [Version](#Version)

###### Constants

- [protocol](#Protocol)
- [version](#Version)

###### Functions

- [isCompatible](#IsCompatible)
- [isMessage](#IsMessage)
- [parseVersion](#ParseVersion)

#### CallFunction

<sup>_Type_</sup>

```ts
type CallFunction<Args> = {
  readonly address: string;
  readonly args: Args;
  readonly id: string;
  readonly noReply: boolean;
  readonly path: string[];
  readonly protocol: "transporter";
  readonly type: Type.Call;
  readonly version: Version;
};
```

A `Call` message is sent to the server to call a remote function.

#### Error

<sup>_Type_</sup>

```ts
type Error<Error> = {
  readonly address: string;
  readonly error: Error;
  readonly id: string;
  readonly protocol: "transporter";
  readonly type: Type.Error;
  readonly version: Version;
};
```

An `Error` message is sent to the client when calling a remote function throws or rejects.

#### GarbageCollect

<sup>_Type_</sup>

```ts
type GarbageCollect = {
  readonly address: string;
  readonly id: string;
  readonly protocol: "transporter";
  readonly type: Type.GarbageCollect;
  readonly version: Version;
};
```

A `GarbageCollect` message is sent to the server when a proxy is disposed on the client.

#### Message

<sup>_Type_</sup>

```ts
type Message<Value> =
  | CallFunction<Value[]>
  | Error<Value>
  | GarbageCollect
  | SetValue<Value>;
```

A discriminated union of the different message types.

#### SetValue

<sup>_Type_</sup>

```ts
type SetValue<Value> = {
  readonly address: string;
  readonly id: string;
  readonly protocol: "transporter";
  readonly type: Type.Set;
  readonly value: Value;
  readonly version: Version;
};
```

A `Set` message is sent to the client after calling a remote function.

#### Type

<sup>_Type_</sup>

```ts
enum Type {
  Call = "Call",
  Error = "Error",
  GarbageCollect = "GarbageCollect",
  Set = "Set"
}
```

An enumerable of the different message types.

#### Type

<sup>_Type_</sup>

```ts
type Version = `${number}.${number}.${number}`;
```

A semantic version string.

#### Protocol

<sup>_Constant_</sup>

```ts
const protocol = "transporter";
```

The name of the protocol.

#### Version

<sup>_Constant_</sup>

```ts
const version: Version;
```

The version of the protocol.

#### IsCompatible

<sup>_Function_</sup>

```ts
function isCompatible(messageVersion: Version): boolean;
```

Returns true if a message is compatible with the current protocol version. A
message is considered compatible if its major and minor versions are the same.

##### Example

```ts
import * as Message from "@daniel-nagy/transporter/Message";

Message.isCompatible(message);
```

#### IsMessage

<sup>_Function_</sup>

```ts
function isMessage<T, Value>(
  message: T | Message<Value>
): message is Message<Value>;
```

Returns true if the value is a Transporter message.

##### Example

```ts
import * as Message from "@daniel-nagy/transporter/Message";

Message.isMessage(value);
```

#### ParseVersion

<sup>_Function_</sup>

```ts
function parseVersion(
  version: Version
): [major: string, minor: string, patch: string];
```

Parses a semantic version string and returns a tuple of the version segments.

##### Example

```ts
import * as Message from "@daniel-nagy/transporter/Message";

Message.parseVersion(message.version);
```

### Metadata

<sup>_Module_</sup>

The Metadata module allows information to be extracted from a proxy.

###### Types

- [Metadata](#Metadata)

###### Functions

- [get](#Get)

#### Metadata

<sup>_Type_<sup>

```ts
type Metadata = {
  /**
   * The address of the server that provides the value.
   */
  address: string;
  /**
   * The path to the value in the original object.
   */
  objectPath: string[];
};
```

Contains information about a proxy object.

#### Get

```ts
function get<Proxy extends object>(proxy: Proxy): Metadata | null;
```

Returns metadata about a proxy. If the object is not a proxy it returns `null`.

##### Example

```ts
import * as Metadata from "@daniel-nagy/transporter/Metadata";

const metadata = Metadata.get(obj);
```

### Observable

<sup>_Module_</sup>

The Observable module provides [ReactiveX](https://reactivex.io/) APIs similar to [rxjs](https://rxjs.dev/). If you make heavy use of Observables then you may decide to use rxjs instead.

Transporter observables should have interop with rxjs observables. If you encounter issues transforming to and from rxjs observables you may create a bug ticket.

Transporter operators may behave differently than rxjs operators of the same name.

###### Types

- [BufferOverflowError](#BufferOverflowError)
- [BufferOverflowStrategy](#BufferOverflowStrategy)
- [BufferOptions](#BufferOptions)
- [EmptyError](#EmptyError)
- [Event](#Event)
- [EventTarget](#EventTarget)
- [Observable](#Observable)
- [ObservableLike](#ObservableLike)
- [Observer](#Observer)
- [Operator](#Operator)
- [Subscription](#Subscription)
- [State](#Subscription)
- [TimeoutError](#TimeoutError)

###### Constructors

- [cron](#Cron)
- [fail](#Fail)
- [from](#From)
- [fromEvent](#FromEvent)
- [of](#Of)

###### Methods

- [pipe](#Pipe)
- [subscribe](#Subscribe)

###### Functions

- [bufferUntil](#BufferUntil)
- [catchError](#CatchError)
- [filter](#Filter)
- [firstValueFrom](#FirstValueFrom)
- [flatMap](#FlatMap)
- [map](#Map)
- [merge](#Merge)
- [take](#Take)
- [takeUntil](#TakeUntil)
- [tap](#Tap)
- [timeout](#Timeout)
- [toObserver](#ToObserver)

#### BufferOverflowError

<sup>_Type_</sup>

```ts
class BufferOverflowError extends Error {}
```

Thrown if a buffer overflow occurs and the buffer overflow strategy is `Error`.

#### BufferOverflowStrategy

<sup>_Type_</sup>

```ts
enum BufferOverflowStrategy {
  /**
   * Discard new values as they arrive.
   */
  DropLatest = "DropLatest",
  /**
   * Discard old values making room for new values.
   */
  DropOldest = "DropOldest",
  /**
   * Error if adding a new value to the buffer will cause an overflow.
   */
  Error = "Error"
}
```

Specifies what to do in the event of a buffer overflow.

#### BufferOptions

<sup>_Type_</sup>

```ts
type BufferOptions = {
  /**
   * The max capacity of the buffer. The default is `Infinity`.
   */
  limit?: number;
  /**
   * How to handle a buffer overflow scenario. The default is `Error`.
   */
  overflowStrategy?: BufferOverflowStrategy;
};
```

Options for operators that perform buffering.

#### EmptyError

<sup>_Type_</sup>

```ts
class EmptyError extends Error {}
```

May be thrown by operators that expect a value to be emitted if the observable completes before emitting a single value.

#### Event

<sup>_Type_</sup>

```ts
interface Event {
  type: string;
}
```

Represents a JavaScript event. Necessary since Transporter does not include types for a specific runtime.

#### EventTarget

<sup>_Type_</sup>

```ts
interface EventTarget {
  addEventListener(type: string, callback: (event: Event) => void): void;
  dispatchEvent(event: Event): boolean;
  removeEventListener(type: string, callback: (event: Event) => void): void;
}
```

Represents a JavaScript event target. Necessary since Transporter does not include types for a specific runtime.

#### Observable

<sup>_Type_</sup>

```ts
class Observable<T> implements ObservableLike<T> {}
```

Observables are lazy push data structures that can emit values both synchronously and asynchronously. Observables are unicast and, unlike promises, may never emit a value or may emit many values.

#### ObservableLike

<sup>_Type_</sup>

```ts
interface ObservableLike<T> {
  subscribe(observerOrNext?: Observer<T> | ((value: T) => void)): Subscription;
}
```

A value is `ObservableLike` if it has a `subscribe` method that takes a function or `Observer` as input and returns a `Subscription`.

#### Observer

<sup>_Type_</sup>

```ts
type Observer<T> = {
  next?(value: T): void;
  error?(error: unknown): void;
  complete?(): void;
};
```

An `Observer` subscribes to an observable.

#### Operator

<sup>_Type_</sup>

```ts
type Operator<T, U> = (observable: ObservableLike<T>) => ObservableLike<U>;
```

An `Operator` is a function that takes an observable as input and returns a new observable as output.

#### Subscription

<sup>_Type_</sup>

```ts
type Subscription = {
  unsubscribe(): void;
};
```

A `Subscription` is returned when an observer subscribes to an observable.

#### State

<sup>_Type_</sup>

```ts
enum State {
  Complete = "Complete",
  Error = "Error",
  NotComplete = "NotComplete",
  Unsubscribed = "Unsubscribed"
}
```

A discriminated type for the different states of an observable.

#### TimeoutError

<sup>_Type_</sup>

```ts
class TimeoutError extends Error {}
```

Thrown by the `timeout` operator if a value is not emitted within the specified amount of time.

#### Cron

<sup>_Constructor_</sup>

```ts
function cron<T>(
  interval: number,
  callback: () => T | Promise<T>
): Observable<T>;
```

Creates an observable that calls a function at a regular interval and emits the value returned by that function.

##### Example

```ts
import * as Observable from "@daniel-nagy/transporter/Observable";

Observable.cron(1000, () => Math.random()).subscribe(console.log);
```

#### Fail

<sup>_Constructor_</sup>

```ts
function fail<E>(errorOrCallback: E | (() => E)): Observable<never>;
```

Creates an observable that will immediately error with the provided value. If the value is a function then the function will be called to get the value.

##### Example

```ts
import * as Observable from "@daniel-nagy/transporter/Observable";

Observable.fail("💩");
```

#### From

<sup>_Constructor_</sup>

```ts
function from<T>(observable: ObservableLike<T> | PromiseLike<T>): Observable<T>;
```

Creates a new `Observable` from an object that is observable like or promise like.

##### Example

```ts
import * as Observable from "@daniel-nagy/transporter/Observable";

Observable.from(Promise.resolve("👍"));
```

#### FromEvent

<sup>_Constructor_</sup>

```ts
function function fromEvent<T extends Event>(target: EventTarget, type: string): Observable<T>;
```

Creates a hot observable from an event target and an event type.

##### Example

```ts
import * as Observable from "@daniel-nagy/transporter/Observable";

Observable.fromEvent(button, "click");
```

#### Of

<sup>_Constructor_</sup>

```ts
function of<T>(...values: [T, ...T[]]): Observable<T>;
```

Creates a new `Observable` that emits each argument synchronously and then completes.

##### Example

```ts
import * as Observable from "@daniel-nagy/transporter/Observable";

Observable.of(1, 2, 3).subscribe(console.log);
```

#### Pipe

<sup>_Method_</sup>

```ts
pipe<A, B, ..., M, N>(
    ...operations: [Operator<A, B>, ..., Operator<M, N>]
  ): Observable<N>
```

Allows chaining operators to perform flow control.

##### Example

```ts
import * as Observable from "@daniel-nagy/transporter/Observable";

Observable.of(1, "2", 3, 4.5).pipe(
  filter(Number.isInteger),
  map((num) => num * 2)
);
```

#### Subscribe

<sup>_Method_</sup>

```ts
subscribe(observerOrNext?: Observer<T> | ((value: T) => void)): Subscription
```

Causes an `Observer` to start receiving values from an observable as they are emitted.

##### Example

```ts
import * as Observable from "@daniel-nagy/transporter/Observable";

Observable.of(1, 2, 3).subscribe(console.log);
```

#### BufferUntil

<sup>_Function_</sup>

```ts
function bufferUntil<T, S>(
  signal: ObservableLike<S>,
  options?: BufferOptions
): (observable: ObservableLike<T>) => Observable<T>;
```

Buffers emitted values until a signal emits or completes. Once the signal emits or completes the buffered values will be emitted synchronously.

##### Example

```ts
import * as Observable from "@daniel-nagy/transporter/Observable";
import * as Subject from "@daniel-nagy/transporter/Subject";

const signal = Subject.init();
Observable.of(1, 2, 3).pipe(bufferUntil(signal)).subscribe(console.log);
setTimeout(() => signal.next(), 2000);
```

#### CatchError

<sup>_Function_</sup>

```ts
function catchError<T>(
  callback: <E>(error: E) => ObservableLike<T>
): (observable: ObservableLike<T>) => Observable<T>;
```

Catches an error emitted by an upstream observable. The callback function can return a new observable to recover from the error. The new observable will completely replace the old one.

##### Example

```ts
import * as Observable from "@daniel-nagy/transporter/Observable";

Observable.of(1, 2, 3)
  .pipe(
    Observable.flatMap(() => Observable.fail("💩")),
    Observable.catchError(() => Observable.of(4, 5, 6))
  )
  .subscribe(console.log);
```

#### Filter

<sup>_Function_</sup>

```ts
function filter<T, S extends T>(
  callback: ((value: T) => value is S) | ((value: T) => boolean)
): (observable: ObservableLike<T>) => Observable<S>;
```

Selectively keeps values for which the callback returns `true`. All other values are discarded.

##### Example

```ts
import * as Observable from "@daniel-nagy/transporter/Observable";

Observable.of(1, 2, 3)
  .pipe(Observable.filter((num) => num % 2 === 0))
  .subscribe(console.log);
```

#### FirstValueFrom

<sup>_Function_</sup>

```ts
function firstValueFrom<T>(observable: ObservableLike<T>): Promise<T>;
```

Transforms an observable into a promise that resolves with the first emitted value from the observable. If the observable errors the promise is rejected. If the observable completes without ever emitting a value the promise is rejected with an `EmptyError`.

**WARNING**

If the observable never emits the promise will never resolve.

##### Example

```ts
import * as Observable from "@daniel-nagy/transporter/Observable";

await Observable.firstValueFrom(Observable.of(1, 2, 3));
```

#### FlatMap

<sup>_Function_</sup>

```ts
function flatMap<T, U>(
  callback: (value: T) => ObservableLike<U> | PromiseLike<U>
): (observable: ObservableLike<T>) => Observable<U>;
```

Calls the callback function for each value emitted by the observable. The callback function returns a new observable that is flattened to avoid creating an observable of observables.

The observable completes when the source observable and all inner observables complete.

##### Example

```ts
import * as Observable from "@daniel-nagy/transporter/Observable";

Observable.of(1, 2, 3).pipe(
  Observable.flatMap((num) => Observable.of(num * 2))
);
```

#### Map

<sup>_Function_</sup>

```ts
function map<T, U>(
  callback: (value: T) => U
): (observable: ObservableLike<T>) => Observable<U>;
```

Calls the callback function for each value emitted by the observable and emits the value returned by the callback function.

##### Example

```ts
import * as Observable from "@daniel-nagy/transporter/Observable";

Observable.of(1, 2, 3).pipe(Observable.map((num) => num * 2));
```

#### Merge

<sup>_Function_</sup>

```ts
function merge<T>(...observables: ObservableLike<T>[]): Observable<T>;
```

Merges 2 or more observables into a single observable. The resulting observable does not complete until all merged observables complete.

Values will be emitted synchronously from each observable in the order provided. Any asynchronous values will be emitted in the order they arrive.

##### Example

```ts
import * as Observable from "@daniel-nagy/transporter/Observable";

Observable.merge(Observable.of(1, 2, 3), Observable.of(4, 5, 6)).subscribe(
  console.log
);
```

#### Take

<sup>_Function_</sup>

```ts
function take(
  amount: number
): <T>(observable: ObservableLike<T>) => Observable<T>;
```

Takes the first `n` values from an observable and then completes.

##### Example

```ts
import * as Observable from "@daniel-nagy/transporter/Observable";

Observable.of(1, 2, 3).pipe(Observable.take(2)).subscribe(console.log);
```

#### TakeUntil

<sup>_Function_</sup>

```ts
function takeUntil(
  signal: ObservableLike<unknown>
): <T>(observable: ObservableLike<T>) => Observable<T>;
```

Takes values from an observable until a signal emits or completes.

##### Example

```ts
import * as Observable from "@daniel-nagy/transporter/Observable";
import * as Subject from "@daniel-nagy/transporter/Subject";

const signal = Subject.init();
Observable.cron(1000, () => Math.random()).pipe(Observable.takeUntil(signal));
setTimeout(() => signal.next(), 2000);
```

#### Tap

<sup>_Function_</sup>

```ts
function tap<T>(
  callback: (value: T) => unknown
): <T>(observable: ObservableLike<T>) => Observable<T>;
```

Allows performing effects when a value is emitted without altering the value that is emitted.

##### Example

```ts
import * as Observable from "@daniel-nagy/transporter/Observable";

Observable.of(1, 2, 3).pipe(Observable.tap(console.log)).subscribe();
```

#### Timeout

<sup>_Function_</sup>

```ts
function timeout<T>(
  milliseconds: number,
  callback?: (error: TimeoutError) => ObservableLike<T>
): <T>(observable: ObservableLike<T>) => Observable<T>;
```

Causes an observable to error if a value is not emitted within the specified timeout limit. The timer resets every time a value is emitted.

The callback function may return a new observable to replace the old one or to return a specific error.

##### Example

```ts
import * as Observable from "@daniel-nagy/transporter/Observable";

Observable.cron(1000, () => Math.random())
  .pipe(Observable.timeout(999))
  .subscribe();
```

#### ToObserver

<sup>_Function_</sup>

```ts
function toObserver<T>(
  observerOrNext?: Observer<T> | ((value: T) => void)
): Observer<T>;
```

Takes a value that may be an observer or a function and returns an observer. If called without an argument it will return an empty object.

##### Example

```ts
import * as Observable from "@daniel-nagy/transporter/Observable";

const identity = (value) => value;
const observer = toObserver(identity);
```

### Proxy

<sup>_Module_</sup>

The Proxy module is used to create proxy objects. Transporter will proxy these objects instead of cloning them.

### PubSub

<sup>_Module_</sup>

The PubSub module is used to wrap an Observable so that it may be used for pub/sub. A PubSub is essentially an Observable who's subscribe and unsubscribe methods are asynchronous.

### Session

<sup>_Module_</sup>

The Session module is used to create Transporter sessions.

### Subject

<sup>_Module_</sup>

A Subject is both an Observable and an Observer. A Subject can be used to multicast an Observable.

### Subprotocol

<sup>_Module_</sup>

The Subprotocol module is used to provide typesafety on top of the Transporter protocol.

### SuperJson

<sup>_Module_</sup>

The SuperJson module extends the JSON protocol to include many built-in JavaScript types, including `Date`, `RegExp`, `Map`, ect.
