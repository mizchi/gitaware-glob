/**
 * Common utilities for pattern matching and conversion
 */

import { minimatch } from "minimatch";

/**
 * Check if a path matches a pattern using minimatch
 * @param path The path to test
 * @param pattern The pattern to match against
 * @returns True if the path matches the pattern
 */
export function matchesPattern(path: string, pattern: string): boolean {
  // For patterns without wildcards, check exact match or directory prefix
  if (!pattern.includes("*") && !pattern.includes("?") && !pattern.includes("[")) {
    return path === pattern || path.startsWith(pattern + "/");
  }
  
  // Use minimatch for wildcard patterns
  return minimatch(path, pattern, { dot: true });
}

/**
 * Check if a pattern is a directory pattern
 * @param pattern The pattern to check
 * @returns True if the pattern represents a directory
 */
export function isDirectoryPattern(pattern: string): boolean {
  // Explicit directory (ends with /)
  if (pattern.endsWith('/')) {
    return true;
  }
  
  // Looks like a directory name (no extension, no wildcards)
  if (!pattern.includes('.') && !pattern.includes('*') && !pattern.includes('?') && !pattern.includes('[')) {
    // But not if it has path separators (could be a specific file path)
    if (!pattern.includes('/')) {
      return true;
    }
  }
  
  return false;
}

/**
 * Normalize a gitignore pattern by removing unnecessary parts
 * @param pattern The pattern to normalize
 * @returns The normalized pattern
 */
export function normalizePattern(pattern: string): string {
  // Remove trailing slash for directory patterns (we'll handle them separately)
  if (pattern.endsWith('/') && pattern.length > 1) {
    return pattern.slice(0, -1);
  }
  
  // Remove leading slash (root-relative patterns)
  if (pattern.startsWith('/')) {
    return pattern.slice(1);
  }
  
  return pattern;
}