<div align="center">
  <div>
    <img width="600px" src="https://github.com/daniel-nagy/transporter/assets/1622446/2d548e46-c66e-43d3-bf9e-f5b9845dbd69">
  </div>
  <b>Typesafe distributed computing in TypeScript.</b>
</div>

## Introduction

Transporter is an RPC library for typesafe distributed computing. The Transporter API was influenced by [comlink](https://github.com/GoogleChromeLabs/comlink) and [rxjs](https://github.com/ReactiveX/rxjs).

Message passing can quickly grow in complexity, cause race conditions, and make apps difficult to maintain. Transporter eliminates the cognitive overhead associated with message passing by enabling the use of functions as a means of communication between distributed systems.

For an introduction to Transporter check out my [blog post](https://danielnagy.me/posts/Post_s2fh85ot8gqd)!

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

### Examples

Here are some examples to help you learn Transporter and become inspired ✨.

#### Using Transporter to build End-To-End Typesafe Applications

[codesandbox.io](https://codesandbox.io/p/devbox/transporter-fullstack-example-st2647)

This example uses [Prisma](https://www.prisma.io/), [React Query](https://tanstack.com/query/latest), and Transporter to build a TypeScript application. What's neat is you can use Transporter to expose your Prisma client to the FE to quickly start prototyping without doing much API work. However, when you're ready to grow your API Transporter is ready to grow with you.

#### Using Transporter to Communicate with iFrames

[codesandbox.io](https://codesandbox.io/p/devbox/transporter-iframe-example-tymcnh)

This example is a pretty basic todo app. However, what's not so basic is that the app is composed of 3 frames; a top frame and 2 subframes. The top frame holds the app state and renders 2 subframes. The first subframe renders a form for adding new todos. The second subframe renders a list of the current todos. The state of all 3 frames is syncroized using Transporter.

This example uses React but Transporter is framework agnostics and can work with any Framework. There is an issue with React Fast Refresh and likely HMR in general. This issue should be investigated before the release of v1.0.0.

#### Using Transporter to Communicate with a Service Worker

[codesandbox.io](https://codesandbox.io/p/devbox/transporter-service-worker-example-d43prv)

This example uses the `BrowserServer` API to communicate with a service worker. If you use Brave you will need to turn off its shield feature to allow service workers in 3rd party iframes, since Codesandbox will run the preview in a crossorigin iframe. You may need to turn off similar security features in other browsers as well, or open the preview in a top level browsing context.

#### Using Transporter to Communicate with a Webview in React Native

[snack.expo.dev](https://snack.expo.dev/@daniel_nagy/transporter-test)

This example renders a webview with a button to scan a barcode. When the button is tapped it will use the `BarCodeScanner` component from Expo to access the camera to scan a barcode. Because this example uses the camera you will need to run it on a real device. I just use the Expo Go app on my phone.

Transporter does not currently offer any React Native specific APIs. However, I may add React Native specific APIs similar to the browser APIs. It's just that React Native can be..._time consuming_.

