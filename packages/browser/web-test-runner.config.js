import { esbuildPlugin } from "@web/dev-server-esbuild";
import { playwrightLauncher } from "@web/test-runner-playwright";
import ts from "typescript";

import tsConfigBase from "./tsconfig-base.json" with { type: "json" };
import tsConfigTest from "./tsconfig-test.json" with { type: "json" };

/**
 * @type import("@web/test-runner").TestRunnerConfig
 */
const config = {
  browsers: [
    playwrightLauncher({ product: "chromium" }),
    playwrightLauncher({ product: "firefox" }),
    playwrightLauncher({ product: "webkit" })
  ],
  files: ["src/**/*.test.ts", "!src/**/*.sw.test.ts"],
  groups: [
    // Unfortunately, Firefox does not support service worker scripts of type
    // module. See https://github.com/mdn/browser-compat-data/issues/17023.
    {
      browsers: [
        playwrightLauncher({ product: "chromium" }),
        playwrightLauncher({ product: "webkit" })
      ],
      files: "src/**/*.sw.test.ts",
      name: "service-worker"
    }
  ],
  middleware: [cors, createScript, serveScript, transpile],
  nodeResolve: true,
  plugins: [esbuildPlugin({ target: "es2022", ts: true })],
  rootDir: "../../",
  testFramework: {
    /**
     * @type Mocha.MochaOptions
     */
    config: {}
  },
  // Workaround to this issue https://github.com/modernweb-dev/web/issues/1462
  testRunnerHtml: (testFramework) => `
    <!DOCTYPE html>
    <html>
      <body>
        <script type="module" src="/packages/browser/testSetup.js"></script>
        <script type="module" src="${testFramework}"></script>
      </body>
    </html>
  `
};

export default config;

const scriptCache = new Map();

/**
 * Allows cross origin iframes to download scripts.
 *
 * @type import("@web/dev-server-core").Middleware
 */
function cors(context, next) {
  context.set("Access-Control-Allow-Origin", "*");
  return next();
}

/**
 * @type import("@web/dev-server-core").Middleware
 */
async function createScript(context, next) {
  if (context.url !== "/create_script") return next();

  const body = await readableToString(context.req);
  const data = JSON.parse(body);

  scriptCache.set(data.fileName, data.src);
  context.response.status = 200;

  return next();
}

/**
 * @type import("@web/dev-server-core").Middleware
 */
async function serveScript(context, next) {
  const script = scriptCache.get(context.url);

  if (!script) return next();

  context.response.status = 200;
  context.response.body = script;
  context.set("Content-Type", "text/javascript");

  return next();
}

/**
 * @type import("@web/dev-server-core").Middleware
 */
async function transpile(context, next) {
  if (context.url !== "/transpile") return next();

  const body = await readableToString(context.req);

  context.response.status = 200;
  context.response.body = ts.transpile(body, {
    ...tsConfigBase.compilerOptions,
    ...tsConfigTest.compilerOptions
  });

  return next();
}

/**
 * @type {(stream: ReadableStream) => Promise<string>}
 */
function readableToString(readable) {
  return new Promise((resolve, reject) => {
    let data = "";

    readable.on("data", (chunk) => {
      data += chunk;
    });

    readable.on("end", () => resolve(data));
    readable.on("error", (err) => reject(err));
  });
}
