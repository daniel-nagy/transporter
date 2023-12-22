import {
  fromEvent,
  firstValueFrom,
  filter
} from "@daniel-nagy/transporter/Observable";

/**
 * This module contains utilities for testing.
 */

type WithNonNullable<T, K extends keyof T> = T & {
  [P in K]: NonNullable<T[P]>;
};

/**
 * An alias for `Mocha.it`.
 */
export const test = it;

/**
 * Creates an iframe from an HTML document. Any scripts in the document with the
 * `data-transpile` attribute will be transpiled using TypeScript.
 *
 * By default the iframe will be cross-origin. To make the iframe same-origin
 * you can set `crossOrigin` to `false`. This is intended mostly for debugging
 * purposes.
 *
 * @returns A promise that resolves with the iframe element once the iframe has
 * loaded.
 */
export async function createIframe(
  srcDoc: string,
  { crossOrigin = true }: { crossOrigin?: boolean } = {}
) {
  const iframe = document.createElement("iframe");

  // makes the iframe cross origin
  iframe.sandbox.add("allow-scripts");

  if (!crossOrigin) {
    iframe.sandbox.add("allow-same-origin");
  }

  iframe.srcdoc = /* html */ `
    <!doctype html>
    <script type="module">
      // Exposes console logs from within the iframe. Note crossOrigin must be
      // false. You can toggle crossOrigin for debugging.
      self.console = self.parent.console;
      window.onerror = console.error;
    </script>
    ${await transpileHtml(srcDoc)}
  `;

  const load = fromEvent(iframe, "load").pipe(firstValueFrom);
  document.body.append(iframe);

  return load.then(
    () => iframe as WithNonNullable<HTMLIFrameElement, "contentWindow">
  );
}

/**
 * Creates a `SharedWorker` from a script. The script will be transpiled using
 * TypeScript.
 */
export async function createSharedWorker(src: string) {
  const url = `data:text/javascript;charset=utf-8;base64,${btoa(
    await transpile(src)
  )}`;

  return new SharedWorker(url, { type: "module" });
}

/**
 * Creates a `ServiceWorker` from a script. The script will be transpiled using
 * TypeScript.
 *
 * @returns A promise that resolves with the service worker and the registration
 * after the service worker has been installed.
 */
export async function createServiceWorker(src: string) {
  const fileName = "/serviceWorker.js";
  await createScript(fileName, src);

  const registration = await navigator.serviceWorker.register(fileName, {
    type: "module"
  });

  const worker = registration.installing;

  if (!worker)
    throw new Error(
      "Service worker is not installing. Is the test environment clean?"
    );

  worker.onerror = (error) => console.log(error.message);

  await fromEvent<Event>(worker, "statechange").pipe(
    filter(() => worker.state === "installed"),
    firstValueFrom
  );

  return [worker, registration] as const;
}

/**
 * Creates a `Worker` from a script. The script will be transpiled using
 * TypeScript.
 */
export async function createWorker(src: string) {
  const url = `data:text/javascript;charset=utf-8;base64,${btoa(
    await transpile(src)
  )}`;

  return new Worker(url, { type: "module" });
}

/**
 * Calls out to the dev server to create a script with the given filename.
 */
async function createScript(fileName: string, src: string): Promise<boolean> {
  return fetch("/create_script", {
    body: JSON.stringify({ fileName, src: src }),
    headers: { "Content-Type": "text/json" },
    method: "POST"
  }).then((result) => result.ok);
}

/**
 * Calls out to the dev server to transpile a script using TypeScript.
 */
function transpile(src: string): Promise<string> {
  const polyfills = /* js */ `
    Symbol.asyncDispose ??= Symbol("Symbol.asyncDispose");
    Symbol.dispose ??= Symbol("Symbol.dispose");
  `;

  return fetch("/transpile", {
    body: /* js */ `
      import "data:text/javascript;charset=utf-8;base64,${btoa(polyfills)}";
      ${src}
    `,
    headers: { "Content-Type": "text/javascript" },
    method: "POST"
  }).then((result) => result.text());
}

/**
 * Given an HTML document, transpiles the content of all script tags with the
 * `data-transpile` attribute and returns the new document.
 */
function transpileHtml(html: string): Promise<string> {
  const container = Object.assign(document.createElement("div"), {
    innerHTML: html
  });

  return Promise.all(
    Array.from(container.querySelectorAll(`script[data-transpile]`)).map(
      (script) =>
        transpile(script.textContent!).then((text) => {
          script.textContent = text;
        })
    )
  ).then(() => container.innerHTML);
}
