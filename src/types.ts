/**
 * Type definitions for gitignore-aware glob
 */

// ===== File System Interface =====
// Define types that are compatible with both node:fs and memfs
export interface Dirent {
  name: string;
  isFile(): boolean;
  isDirectory(): boolean;
  isBlockDevice(): boolean;
  isCharacterDevice(): boolean;
  isSymbolicLink(): boolean;
  isFIFO(): boolean;
  isSocket(): boolean;
  parentPath?: string;
}

export interface StatsBase<T> {
  isFile(): boolean;
  isDirectory(): boolean;
  isBlockDevice(): boolean;
  isCharacterDevice(): boolean;
  isSymbolicLink(): boolean;
  isFIFO(): boolean;
  isSocket(): boolean;
  dev: T;
  ino: T;
  mode: T;
  nlink: T;
  uid: T;
  gid: T;
  rdev: T;
  size: T;
  blksize: T;
  blocks: T;
  atimeMs: T;
  mtimeMs: T;
  ctimeMs: T;
  birthtimeMs: T;
}

// Define the minimal interface that both node:fs/promises and memfs support
// This is effectively the intersection of their APIs
export interface FileSystemInterface {
  // readFile with flexible encoding support (intersection of node and memfs signatures)
  readFile(
    path: string,
    encoding: "utf-8" | "utf8" | { encoding: "utf-8" | "utf8" } | { encoding: "utf-8" | "utf8"; flag?: string }
  ): Promise<string>;
  
  // readdir with withFileTypes (both support this)
  readdir(path: string, options: { withFileTypes: true }): Promise<Dirent[]>;
  
  // access with optional mode (both support this)
  access(path: string, mode?: number): Promise<void>;
  
  // stat (optional as some implementations might not have it)
  stat?(path: string): Promise<StatsBase<any>>;
}

// ===== Public API Options =====
/**
 * Options for the glob function
 */
export interface GlobOptions {
  /**
   * The current working directory
   */
  cwd?: string;
  
  /**
   * Return dirent objects instead of strings
   */
  withFileTypes?: boolean;
  
  /**
   * Additional gitignore files to consider (e.g., global gitignore)
   */
  additionalGitignoreFiles?: string[];
  
  /**
   * Custom file system implementation (e.g., memfs)
   */
  fs?: FileSystemInterface;
}

/**
 * Result of optimizing gitignore patterns
 */
export interface OptimizedPatterns {
  /**
   * Patterns to exclude from glob results
   */
  exclude: string[];
  
  /**
   * Negation patterns (starting with !) that need special handling
   */
  negations: string[];
}

/**
 * Pattern type for gitignore
 */
export interface GitignorePattern {
  /**
   * The original pattern string
   */
  pattern: string;
  
  /**
   * Whether this is a negation pattern
   */
  isNegation: boolean;
  
  /**
   * Whether this pattern represents a directory
   */
  isDirectory: boolean;
  
  /**
   * Whether this pattern is root-relative (starts with /)
   */
  isRootRelative: boolean;
}

/**
 * Parsed gitignore file
 */
export interface ParsedGitignore {
  /**
   * Path to the gitignore file
   */
  filePath: string;
  
  /**
   * Parsed patterns from the file
   */
  patterns: GitignorePattern[];
}

/**
 * Result of gitignore processing
 */
export interface GitignoreProcessingResult {
  /**
   * Files to exclude
   */
  excludePatterns: string[];
  
  /**
   * Negation patterns to apply
   */
  negationPatterns: string[];
}

/**
 * Options for readdir function
 */
export interface ReaddirOptions extends GlobOptions {
  /**
   * Return dirent objects instead of strings
   */
  withFileTypes?: boolean;
  /**
   * Include subdirectories recursively
   */
  recursive?: boolean;
}

// ===== Internal Types =====
/**
 * Internal options with resolved fs and cwd
 */
export interface InternalOptions {
  /** Resolved file system implementation */
  fs: FileSystemInterface;
  /** Resolved absolute current working directory */
  cwd: string;
  /** Additional gitignore files to consider */
  additionalGitignoreFiles?: string[];
}

/**
 * Core options that require fs to be provided
 */
export interface CoreGlobOptions {
  /**
   * The current working directory (required in core)
   */
  cwd: string;
  
  /**
   * Return dirent objects instead of strings
   */
  withFileTypes?: boolean;
  
  /**
   * Additional gitignore files to consider (e.g., global gitignore)
   */
  additionalGitignoreFiles?: string[];
  
  /**
   * Required file system implementation
   */
  fs: FileSystemInterface;
}

/**
 * Core options for readdir
 */
export interface CoreReaddirOptions extends CoreGlobOptions {
  /**
   * Return dirent objects instead of strings
   */
  withFileTypes?: boolean;
  /**
   * Include subdirectories recursively
   */
  recursive?: boolean;
}

// ===== Gitignore Types =====
/**
 * Reason for gitignore match
 */
export interface GitignoreReason {
  /** Path to the .gitignore file */
  gitignoreFile: string;
  /** Line number in the .gitignore file (1-based) */
  lineNumber: number;
  /** The pattern that matched */
  pattern: string;
  /** The file path that was checked */
  filePath: string;
  /** Whether the file is ignored (false if negated) */
  ignored: boolean;
}