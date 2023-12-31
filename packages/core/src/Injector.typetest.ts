import * as Injector from "./Injector.js";

describe("using the Injector", () => {
  test("adding a value to the Injector", () => {
    const Tag = Injector.Tag<string>();
    // $ExpectType Injector
    Injector.empty().add(Tag, "👍");
  });

  test("type mismatch produces an error", () => {
    const Tag = Injector.Tag<string>();
    // @ts-expect-error Argument of type 'number' is not assignable to parameter of type 'string'.
    Injector.add(Tag, 7);
  });
});

describe("decorating functions", () => {
  test("providing a value to a function", () => {
    const Tag = Injector.Tag<string>();
    // $ExpectType () => void
    Injector.provide([Tag], (_a: string) => {});
  });

  test("providing a value to a function with additional arguments", () => {
    const Tag = Injector.Tag<string>();
    // $ExpectType (_b: number) => void
    Injector.provide([Tag], (_a, _b: number) => {});
    //                       ^? (parameter) _a: string
  });

  // TODO: See if type of injected dependency can be inferred when using generics.
  test("generics propagate", () => {
    const Tag = Injector.Tag<string>();
    // $ExpectType <B>(_b: B) => void
    Injector.provide([Tag], <B>(_a: string, _b: B) => {});
  });

  test("providing multiple values to a function", () => {
    const Tag1 = Injector.Tag<string>();
    const Tag2 = Injector.Tag<boolean>();
    // $ExpectType () => void
    Injector.provide([Tag1, Tag2], (_a: string, _b: boolean) => {});
  });

  test("providing multiple values to a function with additional arguments", () => {
    const Tag1 = Injector.Tag<string>();
    const Tag2 = Injector.Tag<boolean>();
    // $ExpectType (_c: string) => string
    Injector.provide(
      [Tag1, Tag2],
      (_a: string, _b: boolean, _c: string) => "🚀"
    );
  });

  test("function argument types can be inferred from tags", () => {
    const Tag1 = Injector.Tag<string>();
    const Tag2 = Injector.Tag<boolean>();
    // $ExpectType (_c: string) => string
    Injector.provide([Tag1, Tag2], (_a, _b, _c: string) => "🚀");
  });

  test("type mismatch produces an error", () => {
    const Tag = Injector.Tag<string>();
    // @ts-expect-error Types of parameters '_a' and 'args_0' are incompatible.
    // Type 'string' is not assignable to type 'number'.
    Injector.provide([Tag], (_a: number) => {});
  });

  test("type mismatch produces an error for multiple tags", () => {
    const Tag1 = Injector.Tag<string>();
    const Tag2 = Injector.Tag<boolean>();
    // @ts-expect-error Type 'boolean' is not assignable to type 'string'.
    Injector.provide([Tag1, Tag2], (_a: string, _b: string) => {});
  });
});

declare function describe(message: string, callback: () => void): void;
declare function test(message: string, callback: () => void): void;
