import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { glob, findGitignore, parseGitignoreToExclude } from "../src/index.js";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";

describe("gitaware-glob", () => {
  const testDir = join(process.cwd(), "test-index-api");
  
  beforeAll(async () => {
    // Create test directory structure
    await mkdir(testDir, { recursive: true });
    await mkdir(join(testDir, "src"), { recursive: true });
    
    // Create test files
    await writeFile(join(testDir, ".gitignore"), "*.log\nnode_modules/\n");
    await writeFile(join(testDir, "index.ts"), "export {};");
    await writeFile(join(testDir, "src", "main.ts"), "console.log('main');");
    await writeFile(join(testDir, "src", "utils.ts"), "export const utils = {};");
    await writeFile(join(testDir, "test.log"), "log content");
  });
  
  afterAll(async () => {
    await rm(testDir, { recursive: true, force: true });
  });
  
  it("should find files with glob pattern", async () => {
    const files = await Array.fromAsync(glob("**/*.ts", { cwd: testDir }));
    expect(Array.isArray(files)).toBe(true);
    expect(files.length).toBe(3); // index.ts, src/main.ts, src/utils.ts
    expect(files).toContain("index.ts");
    expect(files).toContain("src/main.ts");
    expect(files).toContain("src/utils.ts");
  });
  
  it.skip("should work as async generator", async () => {
    const files: string[] = [];
    for await (const file of glob("**/*.ts")) {
      files.push(file);
    }
    expect(files.length).toBeGreaterThan(0);
    expect(typeof files[0]).toBe("string");
  });
  
  it.skip("should support withFileTypes option", async () => {
    const entries = await Array.fromAsync(glob("**/*.ts", { withFileTypes: true }));
    expect(entries.length).toBeGreaterThan(0);
    expect(entries[0]).toHaveProperty("name");
    expect(entries[0]).toHaveProperty("parentPath");
  });

  it("should find gitignore files", async () => {
    const gitignoreFiles = await findGitignore(testDir);
    expect(Array.isArray(gitignoreFiles)).toBe(true);
    expect(gitignoreFiles.length).toBeGreaterThan(0);
    expect(gitignoreFiles[0]).toContain(".gitignore");
  });

  it("should parse gitignore to exclude patterns", async () => {
    const gitignorePath = join(testDir, ".gitignore");
    const excludePatterns = await parseGitignoreToExclude(gitignorePath);
    expect(Array.isArray(excludePatterns)).toBe(true);
    expect(excludePatterns).toContain("**/*.log");
    expect(excludePatterns).toContain("**/node_modules/**");
  });
});