import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { walk } from "../src/index.js";
import { tmpdir } from "node:os";

describe("walk function", () => {
  let testDir: string;
  
  beforeEach(async () => {
    testDir = join(tmpdir(), `test-walk-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
  });
  
  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });
  
  it("should walk all files without gitignore", async () => {
    // Create test structure
    await mkdir(join(testDir, "src"));
    await mkdir(join(testDir, "tests"));
    await writeFile(join(testDir, "README.md"), "# Test");
    await writeFile(join(testDir, "src/index.js"), "console.log('hello');");
    await writeFile(join(testDir, "src/utils.js"), "export const util = () => {};");
    await writeFile(join(testDir, "tests/test.js"), "test();");
    
    const files = [];
    for await (const file of walk({ cwd: testDir })) {
      files.push(file);
    }
    
    expect(files.sort()).toEqual([
      "README.md",
      "src/index.js",
      "src/utils.js",
      "tests/test.js"
    ].sort());
  });
  
  it("should respect gitignore patterns", async () => {
    // Create test structure
    await mkdir(join(testDir, "src"));
    await mkdir(join(testDir, "node_modules"));
    await mkdir(join(testDir, "dist"));
    
    await writeFile(join(testDir, ".gitignore"), `node_modules/
dist/
*.log`);
    
    await writeFile(join(testDir, "README.md"), "# Test");
    await writeFile(join(testDir, "src/index.js"), "console.log('hello');");
    await writeFile(join(testDir, "error.log"), "error");
    await writeFile(join(testDir, "node_modules/package.js"), "module");
    await writeFile(join(testDir, "dist/bundle.js"), "bundle");
    
    const files = [];
    for await (const file of walk({ cwd: testDir })) {
      files.push(file);
    }
    
    expect(files.sort()).toEqual([
      ".gitignore",
      "README.md",
      "src/index.js"
    ].sort());
  });
  
  it("should support withFileTypes option", async () => {
    await mkdir(join(testDir, "src"));
    await writeFile(join(testDir, "README.md"), "# Test");
    await writeFile(join(testDir, "src/index.js"), "console.log('hello');");
    
    const entries = [];
    for await (const entry of walk({ cwd: testDir, withFileTypes: true })) {
      entries.push(entry);
    }
    
    expect(entries).toHaveLength(2);
    expect(entries[0]).toHaveProperty("name");
    expect(entries[0]).toHaveProperty("parentPath");
    
    const names = entries.map(e => e.name).sort();
    expect(names).toEqual(["README.md", "index.js"].sort());
  });
  
  it("should handle nested directories with gitignore", async () => {
    // Create nested structure
    await mkdir(join(testDir, "src/components"), { recursive: true });
    await mkdir(join(testDir, "src/tests"), { recursive: true });
    await mkdir(join(testDir, "build"), { recursive: true });
    
    await writeFile(join(testDir, ".gitignore"), "build/");
    await writeFile(join(testDir, "src/.gitignore"), "tests/\n!tests/important.test.js");
    
    await writeFile(join(testDir, "README.md"), "# Test");
    await writeFile(join(testDir, "src/index.js"), "export {};");
    await writeFile(join(testDir, "src/components/Button.js"), "export const Button = () => {};");
    await writeFile(join(testDir, "src/tests/button.test.js"), "test();");
    await writeFile(join(testDir, "src/tests/important.test.js"), "important test();");
    await writeFile(join(testDir, "build/output.js"), "built");
    
    const files = [];
    for await (const file of walk({ cwd: testDir })) {
      files.push(file);
    }
    
    expect(files.sort()).toEqual([
      ".gitignore",
      "README.md",
      "src/.gitignore",
      "src/components/Button.js",
      "src/index.js"
    ].sort());
    
    // Note: Due to Git's behavior, files in ignored directories cannot be negated
    expect(files).not.toContain("src/tests/important.test.js");
  });
  
  it("should support additionalGitignoreFiles option", async () => {
    // Create global gitignore
    const globalGitignore = join(testDir, ".gitignore_global");
    await writeFile(globalGitignore, "*.bak\n*.tmp");
    
    // Create test files
    await writeFile(join(testDir, "file.txt"), "content");
    await writeFile(join(testDir, "backup.bak"), "backup");
    await writeFile(join(testDir, "temp.tmp"), "temp");
    
    const files = [];
    for await (const file of walk({ 
      cwd: testDir,
      additionalGitignoreFiles: [globalGitignore]
    })) {
      files.push(file);
    }
    
    expect(files).toEqual([".gitignore_global", "file.txt"]);
  });
  
  it("should handle empty directories", async () => {
    await mkdir(join(testDir, "empty"));
    await mkdir(join(testDir, "src"));
    await writeFile(join(testDir, "src/index.js"), "export {};");
    
    const files = [];
    for await (const file of walk({ cwd: testDir })) {
      files.push(file);
    }
    
    expect(files).toEqual(["src/index.js"]);
  });
  
  it("should skip .git directory", async () => {
    await mkdir(join(testDir, ".git"));
    await writeFile(join(testDir, ".git/config"), "[core]");
    await writeFile(join(testDir, "README.md"), "# Test");
    
    const files = [];
    for await (const file of walk({ cwd: testDir })) {
      files.push(file);
    }
    
    expect(files).toEqual(["README.md"]);
  });
});