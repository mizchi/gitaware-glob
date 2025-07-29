import { describe, it, expect } from "vitest";
import { add } from "../dist/index.js";

describe("add function", () => {
  it("should return the sum of two numbers", () => {
    expect(add(2, 3)).toBe(5);
  });
});
