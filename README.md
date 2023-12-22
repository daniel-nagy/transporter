<div align="center">
  <h1>Transporter</h1>
  <b>Typesafe distributed computing in TypeScript.</b>
</div>

## Introduction

Transporter is an RPC library for typesafe distributed computing. The Transporter API was influenced by [comlink](https://github.com/GoogleChromeLabs/comlink) and [rxjs](https://github.com/ReactiveX/rxjs).

Transporter enables high-level programming between distributed systems by using functions as a means of communication. Transporter performs the necessary message orchestration for you so your application code can remain readable and maintainable (your code is readable and maintainable right?).

### Features

- 👌 Typesaftey without code generation.
- 😍 Support for generic functions.
- 🤩 The core API works in any JavaScript runtime[^1].
- 😎 No adaptors necessary to integrate Transporter into your existing codebase.
- 👍 No schema builders required, though you may still use them.
- 🥹 Dependency injection.
- 🫶 FP friendly.
- 🤘 Memoization of remote functions.
- 🫡 Small footprint with 0 dependencies.
- 🚀 Configurable subprotocols.
- 🚰 Flow control and protocol stacking using Observables.
- 🤯 Recursive RPC for select subprotocols.
- 🌶️ PubSub using Observables for select subprotocols.
- 👏 Resource management.
- 🥳 No globals[^2].

[^1]: Hermes, a popular JavaScript runtime for React Native apps, does not support `FinalizationRegistry`. It also requires a polyfill for `crypto.randomUUID`.
[^2]: Transporter has a global `AddressBook` that is used to ensure every server has a unique address.

### 

## Getting Started

To get started using Transporter install the package from the npm registry using your preferred package manager.

```
bun add @daniel-nagy/transporter
```

As of beta 3 Transporter is nearing API stability but there may still be some breaking changes to the API. For API docs see the README for each package.

### Packages

* [Core](/packages/core) - Core APIs that are designed to work in any JavaScript runtime.
* [Browser](/packages/browser) - Wrappers around the browser's messaging APIs that provide normalized interfaces and additional semantics.
