import { describe, test, expectTypeOf } from "vitest";
import { walk, glob, type FileSystemInterface } from "../src/index.js";

describe("FileSystem interface compatibility", () => {
  test("node:fs/promises is compatible with FileSystemInterface", async () => {
    const fs = await import("node:fs/promises");

    expectTypeOf(fs.readFile).toMatchTypeOf<FileSystemInterface["readFile"]>();
    expectTypeOf(fs.readdir).toMatchTypeOf<FileSystemInterface["readdir"]>();
    expectTypeOf(fs.access).toMatchTypeOf<FileSystemInterface["access"]>();

    // Test that walk accepts the fs option
    expectTypeOf<typeof walk>().toBeCallableWith({ fs });
    expectTypeOf<typeof glob>().toBeCallableWith("**/*.js", { fs });
  });

  test("memfs Volume interface shape matches FileSystemInterface", () => {
    // Define the expected shape of memfs Volume methods
    interface MemfsVolumeLike {
      readFile(
        path: string,
        encoding: string,
        callback: (err: any, data: string) => void
      ): void;
      readdir(
        path: string,
        options: { withFileTypes: true },
        callback: (err: any, files: any[]) => void
      ): void;
      access(path: string, callback: (err: any) => void): void;
      stat(path: string, callback: (err: any, stats: any) => void): void;
    }

    // Create a mock volume to test interface compatibility
    const mockVolume: MemfsVolumeLike = {
      readFile: (_path, _encoding, callback) => callback(null, "content"),
      readdir: (_path, _options, callback) => callback(null, []),
      access: (_path, callback) => callback(null),
      stat: (_path, callback) => callback(null, {}),
    };

    // Create a FileSystemInterface adapter for the mock volume
    const memfsAdapter: FileSystemInterface = {
      readFile: (path: string, encoding: "utf-8") =>
        new Promise((resolve, reject) => {
          mockVolume.readFile(path, encoding, (err, data) => {
            if (err) reject(err);
            else resolve(data);
          });
        }),
      readdir: (path: string, options: { withFileTypes: true }) =>
        new Promise((resolve, reject) => {
          mockVolume.readdir(path, options, (err, files) => {
            if (err) reject(err);
            else resolve(files as any);
          });
        }),
      access: (path: string) =>
        new Promise((resolve, reject) => {
          mockVolume.access(path, (err) => {
            if (err) reject(err);
            else resolve(undefined);
          });
        }),
      stat: (path: string) =>
        new Promise((resolve, reject) => {
          mockVolume.stat(path, (err, stats) => {
            if (err) reject(err);
            else resolve(stats as any);
          });
        }),
    };

    // Test that the adapter conforms to FileSystemInterface
    expectTypeOf(memfsAdapter).toMatchTypeOf<FileSystemInterface>();
    expectTypeOf<typeof walk>().toBeCallableWith({ fs: memfsAdapter });
    expectTypeOf<typeof glob>().toBeCallableWith("**/*.js", {
      fs: memfsAdapter,
    });
  });

  test("Usage example with custom fs implementation", () => {
    // Example of how users would implement their own FileSystemInterface
    const customFs: FileSystemInterface = {
      readFile: (_path: string, _encoding: "utf-8") => {
        return Promise.resolve("file content");
      },
      readdir: (_path: string, _options: { withFileTypes: true }) => {
        return Promise.resolve([]);
      },
      access: (_path: string) => {
        // Check if file exists
        return Promise.resolve();
      },
      stat: (_path: string) => {
        return Promise.resolve({} as any);
      },
    };

    // These should type-check without errors
    expectTypeOf<typeof walk>().toBeCallableWith({ fs: customFs });
    expectTypeOf<typeof glob>().toBeCallableWith("**/*.ts", { fs: customFs });
    expectTypeOf<typeof walk>().toBeCallableWith({
      fs: customFs,
      withFileTypes: true,
    });
    expectTypeOf<typeof glob>().toBeCallableWith("src/**/*.js", {
      fs: customFs,
      cwd: "/project",
    });
  });
});
