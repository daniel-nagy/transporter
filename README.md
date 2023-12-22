<div align="center">
  <h1>Transporter</h1>
  <b>Typesafe distributed computing in TypeScript.</b>
</div>

## Introduction

Transporter is an RPC library for typesafe distributed computing. The Transporter API was influenced by [comlink](https://github.com/GoogleChromeLabs/comlink) and [rxjs](https://github.com/ReactiveX/rxjs).

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
- 🚰 Create flow control using Observables.
- 🤯 Recursive RPC for select protocols.
- 🌶️ PubSub using Observables for select protocols.
- 👏 Resource management.
- 🥳 No globals[^2].

[^1]: Hermes, a popular JavaScript runtime for React Native apps, does not support `FinalizationRegistry`. It also requires a polyfill for `crypto.randomUUID`.
[^2]: Transporter has a global `AddressBook` that is used to ensure every server has a unique address.
