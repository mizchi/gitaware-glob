/**
 * Walk directory tree with gitignore support - Core implementation
 * This version requires fs to be passed as an argument
 */
import { join, relative } from "../path-utils.js";
import { shouldExclude as shouldExcludeByPatterns } from "./postprocess.js";
import { findGitignoreInDir } from "./gitignore-files.js";
import type { FileSystemInterface, Dirent, CoreGlobOptions } from "../types.js";

// Using CoreGlobOptions for consistency

/**
 * Pattern with scope information
 */
interface ScopedPattern {
  pattern: string;
  scope: string; // Directory where this pattern applies
}

/**
 * Parse gitignore content and return raw patterns
 */
async function parseGitignorePatterns(
  gitignorePath: string,
  fs: FileSystemInterface
): Promise<string[]> {
  try {
    const content = await fs.readFile(gitignorePath, "utf-8");
    const lines = content.split("\n");
    const patterns: string[] = [];
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }
      
      // .gitignore itself should never be ignored
      if (trimmed === ".gitignore") {
        continue;
      }
      
      patterns.push(trimmed);
    }
    
    return patterns;
  } catch {
    return [];
  }
}

/**
 * Check if a path should be excluded based on scoped gitignore patterns
 */
function shouldExclude(path: string, scopedPatterns: ScopedPattern[], baseDir: string): boolean {
  // Collect applicable patterns for this path
  const applicablePatterns: string[] = [];
  
  for (const { pattern, scope } of scopedPatterns) {
    // Calculate relative path from base directory to scope
    const scopeRelative = relative(baseDir, scope);
    
    // Check if this pattern applies to the given path
    if (scopeRelative === '' || scopeRelative === '.') {
      // Pattern from root gitignore - applies to all files
      applicablePatterns.push(pattern);
    } else {
      // Pattern from subdirectory - only applies to files within that directory
      if (path.startsWith(scopeRelative + '/') || path === scopeRelative) {
        applicablePatterns.push(pattern);
      }
    }
  }
  
  return shouldExcludeByPatterns(path, applicablePatterns);
}

/**
 * Load local gitignore patterns if present
 */
async function loadLocalGitignorePatterns(
  dir: string,
  _baseDir: string,
  scopedPatterns: ScopedPattern[],
  fs: FileSystemInterface
): Promise<ScopedPattern[]> {
  const gitignorePath = await findGitignoreInDir(dir, fs);
  if (!gitignorePath) {
    return scopedPatterns;
  }
  
  try {
    // Parse gitignore file and get raw patterns
    const gitignorePatterns = await parseGitignorePatterns(gitignorePath, fs);
    
    // Create scoped patterns for this directory
    const newScopedPatterns: ScopedPattern[] = gitignorePatterns.map(pattern => ({
      pattern,
      scope: dir
    }));
    
    // Combine existing patterns with new scoped patterns
    return [...scopedPatterns, ...newScopedPatterns];
  } catch {
    return scopedPatterns;
  }
}

/**
 * Process directory entry
 */
async function* processEntry(
  entry: Dirent,
  dir: string,
  baseDir: string,
  scopedPatterns: ScopedPattern[],
  withFileTypes: boolean,
  fs: FileSystemInterface,
  additionalGitignoreFiles?: string[]
): AsyncGenerator<string | Dirent, void, unknown> {
  const fullPath = join(dir, entry.name);
  const relativePath = relative(baseDir, fullPath) || entry.name;
  
  // Skip .git directory
  if (entry.name === '.git') {
    return;
  }
  
  if (entry.isDirectory()) {
    // Recursively walk subdirectories with updated patterns
    yield* walkDirectory(fullPath, baseDir, scopedPatterns, withFileTypes, fs, additionalGitignoreFiles);
  } else {
    // Apply filtering only to files, not directories
    if (!shouldExclude(relativePath, scopedPatterns, baseDir)) {
      if (withFileTypes) {
        // Add parent path information for compatibility
        (entry as any).parentPath = dir;
        yield entry;
      } else {
        yield relativePath;
      }
    }
  }
}

/**
 * Walk directory tree recursively
 */
async function* walkDirectory(
  dir: string,
  baseDir: string,
  scopedPatterns: ScopedPattern[],
  withFileTypes: boolean,
  fs: FileSystemInterface,
  additionalGitignoreFiles?: string[]
): AsyncGenerator<string | Dirent, void, unknown> {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const updatedScopedPatterns = await loadLocalGitignorePatterns(dir, baseDir, scopedPatterns, fs);
    
    for (const entry of entries) {
      yield* processEntry(entry, dir, baseDir, updatedScopedPatterns, withFileTypes, fs, additionalGitignoreFiles);
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
 * Core version that requires fs to be passed
 */
export function walk(options: CoreGlobOptions & { withFileTypes?: false }): AsyncGenerator<string, void, unknown>;
export function walk(options: CoreGlobOptions & { withFileTypes: true }): AsyncGenerator<Dirent, void, unknown>;
export async function* walk(options: CoreGlobOptions): AsyncGenerator<string | Dirent, void, unknown> {
  if (!options.cwd) {
    throw new Error("cwd is required in core module");
  }
  if (!options.fs) {
    throw new Error("fs is required in core module");
  }
  const cwd = options.cwd;
  const absoluteCwd = cwd;
  const withFileTypes = options.withFileTypes ?? false;
  
  // Initialize with basic gitignore patterns (in gitignore format)
  let initialScopedPatterns: ScopedPattern[] = [
    { pattern: '.git', scope: absoluteCwd }
  ];
  
  // Load additional gitignore files if specified
  if (options.additionalGitignoreFiles) {
    for (const additionalFile of options.additionalGitignoreFiles) {
      try {
        const additionalPatterns = await parseGitignorePatterns(additionalFile, options.fs);
        const additionalScopedPatterns: ScopedPattern[] = additionalPatterns.map(pattern => ({
          pattern,
          scope: absoluteCwd // Global patterns apply from root
        }));
        initialScopedPatterns = [...initialScopedPatterns, ...additionalScopedPatterns];
      } catch {
        // Ignore errors loading additional gitignore files
      }
    }
  }
  
  // Walk the directory tree
  yield* walkDirectory(absoluteCwd, absoluteCwd, initialScopedPatterns, withFileTypes, options.fs, options.additionalGitignoreFiles);
}