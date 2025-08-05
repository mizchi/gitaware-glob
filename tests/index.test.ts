import { describe, it, expect } from "vitest";
import { glob, findGitignore, parseGitignoreToExclude } from "../src/index.js";

describe("gitignore-glob", () => {
  it("should find files with glob pattern", async () => {
    const files = await Array.fromAsync(glob("**/*.ts"));
    expect(Array.isArray(files)).toBe(true);
    expect(files.length).toBeGreaterThan(0);
  });
  
  it("should work as async generator", async () => {
    const files: string[] = [];
    for await (const file of glob("**/*.ts")) {
      files.push(file);
    }
    expect(files.length).toBeGreaterThan(0);
    expect(typeof files[0]).toBe("string");
  });
  
  it("should support withFileTypes option", async () => {
    const entries = await Array.fromAsync(glob("**/*.ts", { withFileTypes: true }));
    expect(entries.length).toBeGreaterThan(0);
    expect(entries[0]).toHaveProperty("name");
    expect(entries[0]).toHaveProperty("parentPath");
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