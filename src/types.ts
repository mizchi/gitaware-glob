/**
 * Type definitions for gitignore-aware glob
 */

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