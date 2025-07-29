import { describe, it, expect } from "vitest";
// Should rename this to match your package name
import { add } from "@your/pkgname"; // Importing from the package

describe("add function", () => {
  it("should return the sum of two numbers", () => {
    expect(add(2, 3)).toBe(5);
  });
});
