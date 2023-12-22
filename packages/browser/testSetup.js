Symbol.asyncDispose ??= Symbol("Symbol.asyncDispose");
Symbol.dispose ??= Symbol("Symbol.dispose");

/**
 * @type Mocha.MochaOptions
 */
const options = {};

/**
 * @see https://github.com/modernweb-dev/web/issues/1462
 */
globalThis["__WTR_CONFIG__"].testFrameworkConfig = options;
