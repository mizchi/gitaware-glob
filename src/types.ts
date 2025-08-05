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
export type GitignorePattern = {
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
};