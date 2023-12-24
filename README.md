<div align="center">
  <div>
    <img width="600px" src="https://github.com/daniel-nagy/transporter/assets/1622446/e9ba69dd-7b01-463e-93e6-efcbd72e8b0a">
  </div>
  <b>Typesafe distributed computing in TypeScript.</b>
</div>

## Introduction

Transporter is an RPC library for typesafe distributed computing. The Transporter API was influenced by [comlink](https://github.com/GoogleChromeLabs/comlink) and [rxjs](https://github.com/ReactiveX/rxjs).

Message passing can quickly grow in complexity, cause race conditions, and make apps difficult to maintain. Transporter eliminates the cognitive overhead associated with message passing by enabling the use of functions as a means of communication between distributed systems.

### Features

- 👌 Typesaftey without code generation.[^1]
- 😍 Support for generic functions.
- 🤩 The core API works in any JavaScript runtime.[^2][^3]
- 😎 Easily integrates into your existing codebase.
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
- 🥳 No globals.[^4]
- 🧪 Easy to test.

[^1]: Transporter is tested using the latest version of TypeScript with strict typechecking enabled.
[^2]: Transporter works in Node, Bun, Deno, Chrome, Safari, Firefox, Edge, and React Native.
[^3]: Hermes, a popular JavaScript runtime for React Native apps, does not support `FinalizationRegistry`. It also requires a polyfill for `crypto.randomUUID`.
[^4]: Transporter has a global `AddressBook` that is used to ensure every server has a unique address.

### Practical Usage

Transporter may be used to build typesafe APIs for fullstack TypeScript applications.

Transporter may be used in the browser to communicate with other browsing contexts (windows, tabs, iframes) or workers (dedicated workers, shared workers, service workers). The browser is ripe for distributed computing and parallel processing but not many developers take advantage of this because the `postMessage` API is very primitive.

Transporter may also be used in React Native apps to communicate with webviews. You could take this to the extreme and build your entire native app as a Web app that is wrapped in a React Native shell. The Web app could use Transporter to call out to the React Native app to access native APIs not available in the browser.

## Getting Started

To get started using Transporter install the package from the npm registry using your preferred package manager.

```
bun add @daniel-nagy/transporter
```

As of beta 3 Transporter is nearing API stability but there may still be some breaking changes to the API. For API docs see the README for each package.

### Packages

- [core](/packages/core) - Core APIs that are designed to work in any JavaScript runtime.
- [browser](/packages/browser) - Wrappers around the browser's messaging APIs that provide normalized interfaces and additional semantics.
