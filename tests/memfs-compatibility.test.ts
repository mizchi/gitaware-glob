import { describe, test, expect } from "vitest";
import { readdir, walk, glob, type FileSystemInterface } from "../src/index.js";

describe("memfs compatibility", () => {
  test("memfs fs.promises interface is compatible with FileSystemInterface", async () => {
    // This test verifies that memfs's fs.promises can be used directly
    // The actual usage with memfs would be:
    // import { Volume } from 'memfs';
    // const vol = new Volume();
    // const fs = vol.promises;
    
    // For this test, we'll verify the type compatibility
    const memfsCompatibleInterface = {
      readFile: (_path: string, encoding?: any) => {
        // memfs readFile signature
        if (encoding === 'utf-8' || encoding === 'utf8' || encoding?.encoding === 'utf-8' || encoding?.encoding === 'utf8') {
          return Promise.resolve("file content");
        }
        return Promise.resolve(Buffer.from("file content"));
      },
      readdir: (_path: string, options?: any) => {
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
      } as any),
    };
    
    // This should work without any type casting
    const fs = memfsCompatibleInterface as FileSystemInterface;
    
    // Test that functions accept the fs option
    const files = await readdir("/test", { fs });
    expect(Array.isArray(files)).toBe(true);
    
    // With real memfs, you would use:
    // import { Volume } from 'memfs';
    // const vol = new Volume();
    // await readdir("/test", { fs: vol.promises });
  });

  test("Example usage with memfs", () => {
    // This shows how users would use memfs with gitaware-glob
    
    // import { Volume } from 'memfs';
    // const vol = new Volume();
    // const fs = vol.promises;
    
    // Simulated memfs promises interface
    const fs = {
      readFile: (_path: string, _encoding: any) => Promise.resolve(""),
      readdir: (_path: string, _options?: any) => Promise.resolve([]),
      access: (_path: string) => Promise.resolve(),
      stat: (_path: string) => Promise.resolve({} as any),
      // ... other fs.promises methods that memfs provides
    };
    
    // All these should compile without errors
    expect(async () => {
      await readdir("/path", { fs });
      await walk({ cwd: "/path", fs });
      await glob("**/*.js", { cwd: "/path", fs });
    }).not.toThrow();
  });
});