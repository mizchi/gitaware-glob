/**
 * Walk directory tree with gitignore support
 */
import { readdir, access } from "node:fs/promises";
import { join, isAbsolute, relative } from "node:path";
import { Dirent } from "node:fs";
import { GlobOptions } from "./types.js";
import { findRelevantGitignoreFiles, collectGitignorePatterns, parseGitignoreToExclude } from "./gitignore-files.js";
import { filterByGitignore } from "./postprocess.js";

/**
 * Check if a path should be excluded based on gitignore patterns
 */
function shouldExclude(path: string, patterns: string[]): boolean {
  // Create a temporary array with just this path to check
  const filtered = filterByGitignore([path], patterns);
  return filtered.length === 0;
}

/**
 * Load local gitignore patterns if present
 */
async function loadLocalGitignorePatterns(
  dir: string,
  baseDir: string,
  patterns: string[]
): Promise<string[]> {
  const gitignorePath = join(dir, '.gitignore');
  try {
    await access(gitignorePath);
    const relativeDirPath = relative(baseDir, dir);
    const localGitignorePatterns = await parseGitignoreToExclude(
      gitignorePath,
      relativeDirPath === '.' ? undefined : relativeDirPath
    );
    return [...patterns, ...localGitignorePatterns];
  } catch {
    return patterns;
  }
}

/**
 * Process directory entry
 */
async function* processEntry(
  entry: Dirent,
  dir: string,
  baseDir: string,
  localPatterns: string[],
  withFileTypes: boolean,
  additionalGitignoreFiles?: string[]
): AsyncGenerator<string | Dirent, void, unknown> {
  const fullPath = join(dir, entry.name);
  const relativePath = relative(baseDir, fullPath);
  
  // Skip .git directory
  if (entry.name === '.git') {
    return;
  }
  
  // Check if this path should be excluded
  if (shouldExclude(relativePath, localPatterns)) {
    return;
  }
  
  if (entry.isDirectory()) {
    // Check if the directory itself should be excluded
    const dirPath = relativePath + '/';
    if (!shouldExclude(dirPath, localPatterns)) {
      // Recursively walk subdirectories with updated patterns
      yield* walkDirectory(fullPath, baseDir, localPatterns, withFileTypes, additionalGitignoreFiles);
    }
  } else if (withFileTypes) {
    yield entry;
  } else {
    yield relativePath;
  }
}

/**
 * Walk directory tree recursively
 */
async function* walkDirectory(
  dir: string,
  baseDir: string,
  patterns: string[],
  withFileTypes: boolean,
  additionalGitignoreFiles?: string[]
): AsyncGenerator<string | Dirent, void, unknown> {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    const localPatterns = await loadLocalGitignorePatterns(dir, baseDir, patterns);
    
    for (const entry of entries) {
      yield* processEntry(entry, dir, baseDir, localPatterns, withFileTypes, additionalGitignoreFiles);
    }
  } catch (error: any) {
    // Ignore permission errors
    if (error.code !== 'EACCES' && error.code !== 'EPERM') {
      throw error;
    }
  }
}

/**
 * Walk directory tree with automatic .gitignore support - returns async generator
 */
export function walk(options?: GlobOptions & { withFileTypes?: false }): AsyncGenerator<string, void, unknown>;
export function walk(options: GlobOptions & { withFileTypes: true }): AsyncGenerator<Dirent, void, unknown>;
export async function* walk(options?: GlobOptions): AsyncGenerator<string | Dirent, void, unknown> {
  const cwd = options?.cwd || process.cwd();
  const absoluteCwd = isAbsolute(cwd) ? cwd : join(process.cwd(), cwd);
  const withFileTypes = options?.withFileTypes ?? false;
  
  // Find all relevant .gitignore files
  const relevantGitignoreFiles = await findRelevantGitignoreFiles(absoluteCwd);
  
  // Collect all patterns from .gitignore files
  const allPatterns = await collectGitignorePatterns(
    relevantGitignoreFiles, 
    absoluteCwd,
    options?.additionalGitignoreFiles
  );
  
  // Walk the directory tree
  yield* walkDirectory(absoluteCwd, absoluteCwd, allPatterns, withFileTypes, options?.additionalGitignoreFiles);
}