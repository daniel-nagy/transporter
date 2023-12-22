module.exports = {
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:expect-type/recommended",
    "plugin:require-extensions/recommended"
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    EXPERIMENTAL_useProjectService: true,
    project: true,
    tsconfigRootDir: __dirname
  },
  plugins: [
    "@typescript-eslint",
    "eslint-plugin-expect-type",
    "require-extensions"
  ],
  root: true,
  rules: {
    "@typescript-eslint/no-unused-vars": [
      "warn",
      {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_"
      }
    ],
    "expect-type/expect": "error"
  }
};
