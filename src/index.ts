/**
 * gitaware-glob - Node.js API with automatic .gitignore support
 */
import { promises as fs } from "node:fs";
import { isAbsolute, join } from "node:path";
import { glob as coreGlob } from "./core/glob.js";
import { walk as coreWalk } from "./core/walk.js";
import { readdir as coreReaddir } from "./core/readdir.js";
import type { GlobOptions, Dirent, InternalOptions, ReaddirOptions } from "./types.js";

// Re-export check-ignore functionality
export { checkGitignoreReason, formatGitignoreReason } from "./check-ignore.js";

// Re-export gitignore file functions
export { findGitignore, parseGitignoreToExclude, findGitignoreRecursive } from "./gitignore.js";

/**
 * Glob with automatic .gitignore support - returns async generator
 * Node.js version with default fs implementation
 */
export function glob(
  pattern: string, 
  options?: GlobOptions & { withFileTypes?: false }
): AsyncGenerator<string, void, unknown>;
export function glob(
  pattern: string, 
  options: GlobOptions & { withFileTypes: true }
): AsyncGenerator<Dirent, void, unknown>;
export async function* glob(
  pattern: string, 
  options?: GlobOptions
): AsyncGenerator<string | Dirent, void, unknown> {
  // Resolve defaults for internal options
  const cwd = options?.cwd || process.cwd();
  const absoluteCwd = isAbsolute(cwd) ? cwd : join(process.cwd(), cwd);
  const fileSystem = options?.fs || fs;
  
  // Create resolved internal options
  const internalOptions: InternalOptions = {
    fs: fileSystem,
    cwd: absoluteCwd,
    additionalGitignoreFiles: options?.additionalGitignoreFiles
  };
  
  // Use the core glob with resolved options
  yield* coreGlob(pattern, {
    ...internalOptions,
    withFileTypes: options?.withFileTypes
  } as any);
}

/**
 * Walk directory tree with automatic .gitignore support - returns async generator
 * Node.js version with default fs implementation
 */
export function walk(options?: GlobOptions & { withFileTypes?: false }): AsyncGenerator<string, void, unknown>;
export function walk(options: GlobOptions & { withFileTypes: true }): AsyncGenerator<Dirent, void, unknown>;
export async function* walk(options?: GlobOptions): AsyncGenerator<string | Dirent, void, unknown> {
  // Resolve defaults for internal options
  const cwd = options?.cwd || process.cwd();
  const absoluteCwd = isAbsolute(cwd) ? cwd : join(process.cwd(), cwd);
  const fileSystem = options?.fs || fs;
  
  // Create resolved internal options
  const internalOptions: InternalOptions = {
    fs: fileSystem,
    cwd: absoluteCwd,
    additionalGitignoreFiles: options?.additionalGitignoreFiles
  };
  
  // Use the core walk with resolved options
  yield* coreWalk({
    ...internalOptions,
    withFileTypes: options?.withFileTypes
  } as any);
}

/**
 * Read directory contents with automatic .gitignore support
 * Node.js version with default fs implementation
 */
export function readdir(path: string, options?: ReaddirOptions & { withFileTypes?: false }): Promise<string[]>;
export function readdir(path: string, options: ReaddirOptions & { withFileTypes: true }): Promise<Dirent[]>;
export function readdir(path: string, options?: ReaddirOptions): Promise<string[] | Dirent[]> {
  const absolutePath = isAbsolute(path) ? path : join(process.cwd(), path);
  const fileSystem = options?.fs || fs;
  
  // Create resolved internal options
  const internalOptions: InternalOptions = {
    fs: fileSystem,
    cwd: absolutePath,
    additionalGitignoreFiles: options?.additionalGitignoreFiles
  };
  
  // Use the core readdir with resolved options
  return coreReaddir(absolutePath, {
    ...internalOptions,
    withFileTypes: options?.withFileTypes,
    recursive: options?.recursive
  } as any);
}

// Re-export types
export type { 
  GlobOptions, 
  ReaddirOptions,
  FileSystemInterface, 
  Dirent, 
  StatsBase,
  GitignoreReason,
  OptimizedPatterns,
  GitignorePattern,
  ParsedGitignore,
  GitignoreProcessingResult
} from "./types.js";