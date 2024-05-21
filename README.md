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

Transporter my be used for inter-process communication in Electron applications.

Transporter may also be used in React Native apps to communicate with webviews. You could take this to the extreme and build your entire native app as a Web app that is wrapped in a React Native shell. The Web app could use Transporter to call out to the React Native app to access native APIs not available in the browser.

## Getting Started

To get started using Transporter install the package from the npm registry using your preferred package manager.

```
npm add @daniel-nagy/transporter
```

As of beta 3 Transporter is nearing API stability but there may still be some breaking changes to the API. For API docs see the README for each package.

### Packages

- [core](/packages/core) - Core APIs that are designed to work in any JavaScript runtime.
- [browser](/packages/browser) - Wrappers around the browser's messaging APIs that provide normalized interfaces and additional semantics.

### The Basics

Let's get up and running with Transporter. We'll create a `User` module and use Transporter to expose that module.

Here's our `User` module.

```ts
const users = [
  { id: 0, name: "Dan" },
  { id: 1, name: "Jessica" },
  { id: 2, name: "Mike" },
];

export async function list() {
  return users;
}

export async function findById(id: number) {
  return users.find((user) => user.id === id);
}
```

Notice that our `User` module is just a plain old JavaScript module. There's no tight coupling between Transporter and our functions. Nor does Transporter impose any semantics on our API. You can use modules, plain objects, classes, or even arrays it doesn't really matter. The only requirement is that our functions must return a `Promise`. To expose our `User` module we need to create a `ServerSession`. At a minimum, when creating a session, we must provide a `Subprotocol`. A subprotocol is necessary to provide typesaftey at the protocol level. Let's create a subprotocol and a session for our server.

```ts
import * as Json from "@daniel-nagy/transporter/Json";
import * as Session from "@daniel-nagy/transporter/Session";
import * as Subprotocol from "@daniel-nagy/transporter/Subprotocol";

import * as User from "./User";

const Api = {
  User,
};

export type Api = typeof Api;

const protocol = Subprotocol.init({
  connectionMode: Subprotocol.ConnectionMode.Connectionless,
  dataType: Subprotocol.DataType<Json.t>(),
  operationMode: Subprotocol.OperationMode.Unicast,
  transmissionMode: Subprotocol.TransmissionMode.HalfDuplex,
});

const session = Session.server({ protocol, provide: Api });
```

For now don't worry about the different modes and just focus on the data type. In this case we are telling Transporter that our API only uses JSON data types. With strict type checking enabled we get a type error.

```
Type 'undefined' is not assignable to type 'Json'.
```

Can you spot the problem? If you can't then don't worry because the compiler spotted it for you. We are telling Transporter that our API only uses JSON data types but the return type of `findById` could be `undefined`. To fix this we could update `findById` to always return valid JSON, for example by returning `null` if the user is not found, but since our server and client are both JavaScript runtimes it would be nice if we could allow `undefined`. Let's instead use the `SuperJson` type provided by Transporter. The `SuperJson` type is a subtype of JSON that allows many built in JavaScript types, such as `undefined`, `Date`, `RegExp`, `Map`, etc.

```diff
- import * as Json from "@daniel-nagy/transporter/Json";
+ import * as SuperJson from "@daniel-nagy/transporter/SuperJson";

-   dataType: Subprotocol.DataType<Json.t>(),
+   dataType: Subprotocol.DataType<SuperJson.t>(),
```

With that change the error will go away.

We just learned that Transporter provides type safety at the protocol level. It will complain if our API and subprotocol are incompatible. We also learned that there is no tight coupling between Transporter and how we build our API. We can also see that Transporter does not use a router. Instead objects can be composed to create namespaces.

Let's move on now and create a client session.

```typescript
import * as Session from "@daniel-nagy/transporter/Session";
import * as Subprotocol from "@daniel-nagy/transporter/Subprotocol";
import * as SuperJson from "@daniel-nagy/transporter/SuperJson";

import type { Api } from "./Server";

const protocol = Subprotocol.init({
  connectionMode: Subprotocol.ConnectionMode.Connectionless,
  dataType: Subprotocol.DataType<SuperJson.t>(),
  operationMode: Subprotocol.OperationMode.Unicast,
  transmissionMode: Subprotocol.TransmissionMode.HalfDuplex,
});

const session = Session.client({
  protocol,
  resource: Session.Resource<Api>(),
});

const client = session.createProxy();
```

Creating a client session is almost identical to creating a server session. Generally the client and the server will use the same subprotocol. To get a client that acts as a proxy for our API we use the `createProxy` method on the `ClientSession`.

The last thing we need to do is we need to get our server session and our client session to talk to each other. A session is both a message source and a message sink. If our server session and our client session were in the same process then we could just pipe the output of one into the input of the other to complete the circuit.

```typescript
serverSession.output.subscribe(clientSession.input);
clientSession.output.subscribe(serverSession.input);
```

While using Transporter in a single process is not very useful, it is useful to understand this example because it will allow you to easily adapt Transporter for just about any transport layer. As long as you can route the messages then you will be able to get Transporter working. This makes the core Transporter API general purpose and, perhaps ironically, transport layer agnostic.

Let's finish off this example by using HTTP as our Transport layer. HTTP is a text base protocol so we need to go from `SuperJson` to `string` in order to use HTTP. Let's start on the server side. I'm going to use Bun's built-in server API for this example.

```ts
import * as Message from "@daniel-nagy/transporter/Message";
import * as Observable from "@daniel-nagy/transporter/Observable";

Bun.serve({
  async fetch(req) {
    using session = Session.server({ protocol, provide: Api });
    const reply = Observable.firstValueFrom(session.output);
    const message = SuperJson.fromJson(await req.json());
    session.input.next(message as Message.t<SuperJson.t>);
    return Response.json(SuperJson.toJson(await reply));
  },
  port: 3000,
});
```

Notice I moved the creation of the session into the request handler. This is perfectly fine, each request will create a session and the session will be terminated at the end of the request handler. In this example this is accomplished using a new feature of JavaScript called explicit resource management. That's the `using` syntax you may be wondering about. If you are unable to use explicit resource management then that is ok. You can just call `session.terminate()` explicitly before returning the response.

We get the request body as JSON and then decode the message using `SuperJson.fromJson`. We then feed that massage into our session and wait for a reply. We encode the reply as text, using the reverse process, and then send the message to the client.

Let's move on now to our client. For our client I am going to use JavaScript's built-in HTTP client `fetch`.

```ts
import * as Observable from "@daniel-nagy/transporter/Observable";

const session = Session.client({
  protocol,
  resource: Session.Resource<Api>(),
});

const toRequest = (message: string) =>
  new Request("http://localhost:3000", {
    body: message,
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });

session.output
  .pipe(
    Observable.map(SuperJson.toJson),
    Observable.map(JSON.stringify),
    Observable.map(toRequest),
    Observable.flatMap(fetch),
    Observable.flatMap((response) => response.json()),
    Observable.map(SuperJson.fromJson)
  )
  .subscribe(session.input);

const client = session.createProxy();
```

We take the output of our client session and map over it to do some protocol stacking and make our fetch request. We then, like an ouroboros, feed the response back into our client session to complete the circuit. While slightly more keystrokes than alternative libraries, this example is endlessly adaptable and customizable.

We just learned that a session is both a message source and a message sink. We also learned that the core API of Transporter is transport layer agnostic. To get Transporter working with any transport layer we just need to complete the circuit.

#### What about these Modes?

The modes are used to determine if recursive RPC is enabled or not. Recursive RPC refers to including functions or proxies in function IO. This is an interesting concept because it allows state to be held between processes on the call stack. To enable recursive RPC your transport protocol must be connection-oriented and bidirectional. A transport protocol is bidirectional if its transmission mode is `Duplex` or `HalfDuplex` and its operation mode is `Unicast`.

It is important to make sure your subprotocol and your transport layer are compatible. For example, HTTP is a connectionless protocol. So even though it is bidirectional you should not use recursive RPC if you are using HTTP as your transport protocol. Fortunately, when using Transporter with WebSockets, in the browser, React Native, or in Electron apps you often can enable recursive RPC. It may be possible to use recursive RPC with HTTP streaming. If `WebTransport` becomes generally available then that would likely allow recursive RPC over HTTP. For completeness here is an example subprotocol that would enable recursive RPC.

```ts
const protocol = Subprotocol.init({
  connectionMode: Subprotocol.ConnectionMode.ConnectionOriented,
  dataType: Subprotocol.DataType<SuperJson.t>(),
  operationMode: Subprotocol.OperationMode.Unicast,
  transmissionMode: Subprotocol.TransmissionMode.Duplex,
});
```

That concludes the introduction to Transporter but Transporter provides many more APIs for things like memoization and dependency injection. You can find API docs in the README of each package. Also check out the examples below to see how you can adapt Transporter for different use cases. If you have any questions then feel free to start a discussion on GitHub 🤘.

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

[codesandbox.io](https://codesandbox.io/p/devbox/transporter-service-worker-example-mvmmqc)

This example uses the `BrowserServer` API to communicate with a service worker. If you use Brave you will need to turn off its shield feature to allow service workers in 3rd party iframes, since Codesandbox will run the preview in a crossorigin iframe. You may need to turn off similar security features in other browsers as well, or open the preview in a top level browsing context.

#### Using Transporter to Communicate with a Webview in React Native

[snack.expo.dev](https://snack.expo.dev/@daniel_nagy/transporter-test)

This example renders a webview with a button to scan a barcode. When the button is tapped it will use the `BarCodeScanner` component from Expo to access the camera to scan a barcode. Because this example uses the camera you will need to run it on a real device. I just use the Expo Go app on my phone.

Transporter does not currently offer any React Native specific APIs. However, I may add React Native specific APIs similar to the browser APIs. It's just that React Native can be..._time consuming_.
