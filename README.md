# gitignore-glob

A glob implementation that respects .gitignore files, providing a drop-in replacement for node:fs/promises glob API.

## Installation

```bash
pnpm add gitignore-glob
```

## Usage

```typescript
import { glob, findGitignore, parseGitignoreToExclude } from 'gitignore-glob';

// Same API as node:fs/promises glob, but automatically respects .gitignore
const files = await glob('**/*.ts');
const jsFiles = await glob('src/**/*.js', { cwd: '/path/to/project' });

// Find all .gitignore files recursively up to the root
const gitignoreFiles = await findGitignore('/path/to/project');
// => ['/path/to/project/.gitignore', '/path/to/.gitignore']

// Parse .gitignore file and generate exclude patterns
const excludePatterns = await parseGitignoreToExclude('/path/to/.gitignore');
// => ['node_modules/**', '*.log', '!important.log']
```

## Build and Test

```bash
pnpm install
pnpm test
pnpm build
```

## License

MIT