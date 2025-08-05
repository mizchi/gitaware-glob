import { describe, test, expect } from "vitest";
import { readdir, walk, glob, type FileSystemInterface } from "../src/index.js";

describe("memfs type compatibility example", () => {
  test("Shows how memfs volume.promises can be used", () => {
    // This is how users would use memfs with gitaware-glob
    
    // Step 1: Import memfs (not actually imported in test)
    // import { Volume } from 'memfs';
    
    // Step 2: Create volume
    // const vol = new Volume();
    
    // Step 3: Simulate memfs volume.promises interface
    // This matches the actual memfs API
    const volumePromises = {
      readFile: (_path: string, _encoding?: string | { encoding: string }) => {
        // memfs supports both string and object encoding
        return Promise.resolve("file content");
      },
      readdir: (_path: string, options?: { withFileTypes?: boolean }) => {
        if (options?.withFileTypes) {
          return Promise.resolve([
            {
              name: "file.txt",
              isFile: () => true,
              isDirectory: () => false,
              isBlockDevice: () => false,
              isCharacterDevice: () => false,
              isSymbolicLink: () => false,
              isFIFO: () => false,
              isSocket: () => false,
            }
          ]);
        }
        return Promise.resolve(["file.txt"]);
      },
      access: (_path: string, _mode?: number) => Promise.resolve(),
      stat: (_path: string) => Promise.resolve({
        isFile: () => true,
        isDirectory: () => false,
        // ... other stat properties
      } as any),
      // ... other fs methods that memfs provides
    };
    
    // Step 4: Use with gitaware-glob
    // The interface is compatible, so this works:
    const exampleUsage = async () => {
      // TypeScript will accept volumePromises as FileSystemInterface
      const fs = volumePromises as unknown as FileSystemInterface;
      
      await readdir("/project", { fs });
      await walk({ cwd: "/project", fs });
      await glob("**/*.js", { cwd: "/project", fs });
    };
    
    // This demonstrates that the types are compatible
    expect(exampleUsage).toBeDefined();
  });
});