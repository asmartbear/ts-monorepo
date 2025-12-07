import 'jest';      // Ref: https://jestjs.io/docs/en/expect#reference
import objectId from "../src";

test("construction", () => {
  const a = { a: 1 };
  const b = { a: 1 };
  expect(objectId(a)).toBe(1);
  expect(objectId(a)).toBe(1);
  expect(objectId(b)).toBe(2);
  expect(objectId(a)).toBe(1);
  expect(objectId(b)).toBe(2);
  expect(objectId({})).toBe(3);
  expect(objectId({})).toBe(4);
  expect(objectId({})).toBe(5);
  expect(objectId(a)).toBe(1);
  expect(objectId(b)).toBe(2);
  expect(objectId(null)).toBe(0);   // special case
});

