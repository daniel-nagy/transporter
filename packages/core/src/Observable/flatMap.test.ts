import { expect, test } from "bun:test";
import { spy } from "tinyspy";

import { flatMap } from "./flatMap.js";
import { of } from "./of.js";
import { Subject } from "../Subject.js";

test("the observable does not complete if the inner observable completes", () => {
  const subject = new Subject();
  const complete = spy();

  subject
    .asObservable()
    .pipe(flatMap(() => of(1)))
    .subscribe({ complete });

  subject.next(null);

  expect(complete.callCount).toBe(0);
});
