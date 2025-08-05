import { describe, test, expect } from "vitest";
import * as fs from "node:fs/promises";
import { readdir, walk, glob, type FileSystemInterface } from "../src/index.js";

describe("node:fs/promises compatibility", () => {
  test("node:fs/promises can be used directly as FileSystemInterface", async () => {
    // This should work without any type casting
    const nodeFs: FileSystemInterface = fs;
    
    // Test that all functions accept node:fs/promises directly
    const files1 = await readdir("src", { fs: nodeFs });
    expect(Array.isArray(files1)).toBe(true);
    expect(files1.length).toBeGreaterThan(0);
    
    // Test with walk
    const walkFiles: string[] = [];
    for await (const file of walk({ cwd: "src", fs: nodeFs })) {
      walkFiles.push(file);
      if (walkFiles.length > 5) break; // Limit for test
    }
    expect(walkFiles.length).toBeGreaterThan(0);
    
    // Test with glob - use a pattern that will match existing files
    const globFiles: string[] = [];
    for await (const file of glob("*.ts", { cwd: "src", fs: nodeFs })) {
      globFiles.push(file);
      if (globFiles.length > 5) break; // Limit for test
    }
    expect(globFiles.length).toBeGreaterThan(0);
  });

  test("node:fs/promises can be passed directly without variable", async () => {
    // Direct usage without storing in a variable
    const files = await readdir("src", { fs });
    expect(Array.isArray(files)).toBe(true);
    expect(files.length).toBeGreaterThan(0);
    
    // With walk
    let count = 0;
    for await (const _file of walk({ cwd: "src", fs })) {
      count++;
      if (count > 5) break;
    }
    expect(count).toBeGreaterThan(0);
    
    // With glob
    const globFiles: string[] = [];
    for await (const file of glob("*.ts", { cwd: "src", fs })) {
      globFiles.push(file);
      if (globFiles.length > 5) break;
    }
    expect(globFiles.length).toBeGreaterThan(0);
  });

  test("verify type compatibility at compile time", () => {
    // This is a compile-time test
    // If this compiles, it means node:fs/promises implements FileSystemInterface
    const testAssignment = (): void => {
      const fsInterface: FileSystemInterface = fs;
      expect(fsInterface).toBeDefined();
    };
    
    expect(testAssignment).toBeDefined();
  });
});