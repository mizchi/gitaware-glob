import { describe, test, expect, beforeEach, afterEach } from "vitest";
import { readdir } from "../src/index.js";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("readdir with gitignore support", () => {
  let testDir: string;
  
  beforeEach(async () => {
    testDir = join(tmpdir(), "test-readdir-" + Date.now());
    await mkdir(testDir, { recursive: true });
  });
  
  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  test("readdir returns files in current directory only", async () => {
    // Create test structure
    await writeFile(join(testDir, "file1.js"), "content1");
    await writeFile(join(testDir, "file2.ts"), "content2");
    await mkdir(join(testDir, "subdir"));
    await writeFile(join(testDir, "subdir", "file3.js"), "content3");
    
    const files = await readdir(testDir);
    
    expect(files.sort()).toEqual(["file1.js", "file2.ts", "subdir"].sort());
  });

  test("readdir respects .gitignore", async () => {
    // Create test structure
    await writeFile(join(testDir, "file1.js"), "content1");
    await writeFile(join(testDir, "file2.ts"), "content2");
    await writeFile(join(testDir, "ignored.log"), "log content");
    await writeFile(join(testDir, ".gitignore"), "*.log");
    
    const files = await readdir(testDir);
    
    expect(files).toContain("file1.js");
    expect(files).toContain("file2.ts");
    expect(files).not.toContain("ignored.log");
  });

  test("readdir with withFileTypes returns Dirent objects", async () => {
    // Create test structure
    await writeFile(join(testDir, "file1.js"), "content1");
    await mkdir(join(testDir, "subdir"));
    
    const entries = await readdir(testDir, { withFileTypes: true });
    
    expect(entries.length).toBe(2);
    
    const file = entries.find(e => e.name === "file1.js");
    expect(file).toBeDefined();
    expect(file!.isFile()).toBe(true);
    expect(file!.isDirectory()).toBe(false);
    
    const dir = entries.find(e => e.name === "subdir");
    expect(dir).toBeDefined();
    expect(dir!.isFile()).toBe(false);
    expect(dir!.isDirectory()).toBe(true);
  });

  test("readdir with recursive option", async () => {
    // Create test structure
    await writeFile(join(testDir, "file1.js"), "content1");
    await mkdir(join(testDir, "subdir"));
    await writeFile(join(testDir, "subdir", "file2.js"), "content2");
    await mkdir(join(testDir, "subdir", "nested"));
    await writeFile(join(testDir, "subdir", "nested", "file3.js"), "content3");
    
    const files = await readdir(testDir, { recursive: true });
    
    expect(files.sort()).toEqual([
      "file1.js",
      "subdir",
      "subdir/file2.js",
      "subdir/nested",
      "subdir/nested/file3.js"
    ].sort());
  });

  test("readdir with recursive and gitignore", async () => {
    // Create test structure
    await writeFile(join(testDir, "file1.js"), "content1");
    await mkdir(join(testDir, "subdir"));
    await writeFile(join(testDir, "subdir", "file2.js"), "content2");
    await writeFile(join(testDir, "subdir", "ignored.log"), "log");
    await writeFile(join(testDir, ".gitignore"), "*.log");
    
    const files = await readdir(testDir, { recursive: true });
    
    expect(files).toContain("file1.js");
    expect(files).toContain("subdir");
    expect(files).toContain("subdir/file2.js");
    expect(files).not.toContain("subdir/ignored.log");
  });

  test("readdir respects nested gitignore", async () => {
    // Create test structure
    await writeFile(join(testDir, "file1.js"), "content1");
    await mkdir(join(testDir, "subdir"));
    await writeFile(join(testDir, "subdir", "file2.js"), "content2");
    await writeFile(join(testDir, "subdir", "temp.txt"), "temp");
    await writeFile(join(testDir, "subdir", ".gitignore"), "temp.txt");
    
    const files = await readdir(testDir, { recursive: true });
    
    expect(files).toContain("file1.js");
    expect(files).toContain("subdir");
    expect(files).toContain("subdir/file2.js");
    expect(files).not.toContain("subdir/temp.txt");
  });

  test("readdir with custom fs implementation", async () => {
    // Test that readdir accepts fs option (type checking)
    const customFs = {
      readFile: (_path: string, _encoding: "utf-8") => Promise.resolve(""),
      readdir: (_path: string, _options: { withFileTypes: true }) => Promise.resolve([]),
      access: (_path: string) => Promise.resolve(),
      stat: (_path: string) => Promise.resolve({} as any),
    };
    
    // This should compile without errors
    const result = await readdir(testDir, { fs: customFs });
    expect(Array.isArray(result)).toBe(true);
  });
});