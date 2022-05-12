/*
 * For a detailed explanation regarding each configuration property and type check, visit:
 * https://jestjs.io/docs/configuration
 */

export default {
  clearMocks: true,
  collectCoverageFrom: ["./**/!(*.d).ts"],
  coverageProvider: "v8",
  coverageReporters: ["json-summary", "lcov"],
  globals: {
    "ts-jest": {
      tsconfig: "tsconfig.test.json",
    },
  },
  preset: "ts-jest",
};
