import { describe, it, expect } from "vitest";
import { glob, findGitignore, parseGitignoreToExclude } from "../src/index.js";

describe("gitignore-glob", () => {
  it("should find files with glob pattern", async () => {
    const files = await glob("**/*.ts");
    expect(Array.isArray(files)).toBe(true);
    expect(files.length).toBeGreaterThan(0);
  });

  it("should find gitignore files", async () => {
    const gitignoreFiles = await findGitignore(process.cwd());
    expect(Array.isArray(gitignoreFiles)).toBe(true);
  });

  it("should parse gitignore to exclude patterns", async () => {
    const excludePatterns = await parseGitignoreToExclude(".gitignore");
    expect(Array.isArray(excludePatterns)).toBe(true);
  });
});