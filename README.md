# gitaware-glob

A glob implementation that respects .gitignore files, providing a drop-in replacement for node:fs/promises glob API.

## Installation

```bash
npm add gitaware-glob
```

## Usage

```typescript
import {
  glob,
  walk,
  findGitignore,
  parseGitignoreToExclude,
} from "gitaware-glob";

// Same API as node:fs/promises glob, but automatically respects .gitignore
const files = await glob("**/*.ts");
const jsFiles = await glob("src/**/*.js", { cwd: "/path/to/project" });

// Walk directory tree without glob pattern, respecting .gitignore
for await (const file of walk()) {
  console.log(file); // All files except those ignored by .gitignore
}

// Walk with file types (returns Dirent objects)
for await (const entry of walk({ withFileTypes: true })) {
  if (entry.isDirectory()) {
    console.log(`Directory: ${entry.name}`);
  } else {
    console.log(`File: ${entry.name}`);
  }
}

// Support for additional gitignore files (e.g., global gitignore)
const files = await Array.fromAsync(
  glob("**/*.js", {
    additionalGitignoreFiles: ["/home/user/.gitignore_global"],
  })
);

// Find all .gitignore files recursively up to the root
const gitignoreFiles = await findGitignore("/path/to/project");
// => ['/path/to/project/.gitignore', '/path/to/.gitignore']

// Parse .gitignore file and generate exclude patterns
const excludePatterns = await parseGitignoreToExclude("/path/to/.gitignore");
// => ['node_modules/**', '*.log', '!important.log']
```

## Using with memfs

This library supports using [memfs](https://github.com/streamich/memfs) as a custom file system:

```typescript
import { Volume } from "memfs";
import { glob, type FileSystemInterface } from "gitaware-glob";
// Create an in-memory file system
const vol = new Volume();
// Set up a project structure
vol.mkdirSync("/project/src", { recursive: true });
vol.writeFileSync("/project/src/index.js", 'console.log("hello");');

// Use with gitaware-glob (cast to FileSystemInterface for type safety)
const files = await Array.fromAsync(
  glob("**/*.js", {
    cwd: "/project",
    fs: vol.promises as FileSystemInterface,
  })
);
console.log(files);
```

## API

### `readdir(path, options?)`

Read directory contents with automatic .gitignore support.

```typescript
// Read files in current directory
const files = await readdir(".");

// Get Dirent objects
const entries = await readdir(".", { withFileTypes: true });

// Read recursively
const allFiles = await readdir(".", { recursive: true });

// With custom file system
const files = await readdir("/path", { fs: customFs });
```

## Build and Test

```bash
pnpm install
pnpm test
pnpm build
```

## Prior Art

- https://www.npmjs.com/package/glob-gitignore
- https://crates.io/crates/gitignore

## License

MIT
