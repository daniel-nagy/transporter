# Core

The core package contains APIs designed to work in any JavaScript runtime.

## Modules

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

A BehaviorSubject is a Subject that replays the last emitted value when subscribed to.

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
