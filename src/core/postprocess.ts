/**
 * Postprocess file paths against gitignore patterns
 * 
 * This handles the full gitignore pattern matching including negations,
 * using minimatch for consistent pattern matching behavior.
 */

import { minimatch } from "minimatch";

/**
 * Check if a file path should be excluded based on gitignore patterns
 * @param filePath The file path to check (relative)
 * @param patterns All gitignore patterns including negations
 * @returns true if the file should be excluded, false if included
 */
export function shouldExclude(filePath: string, patterns: string[]): boolean {
  let excluded = false;
  
  // Process patterns in order (gitignore rules are order-dependent)
  for (const pattern of patterns) {
    if (pattern.startsWith('!')) {
      // Negation pattern
      const negPattern = pattern.slice(1);
      if (matchesGitignorePattern(filePath, negPattern)) {
        excluded = false;
      }
    } else if (matchesGitignorePattern(filePath, pattern)) {
      // Exclusion pattern
      excluded = true;
    }
  }
  
  return excluded;
}

/**
 * Check if a simple pattern matches directories in the path
 */
function matchesAsDirectory(path: string, pattern: string): boolean {
  // For non-wildcard patterns, check if any directory matches
  if (!pattern.includes('*') && !pattern.includes('?') && !pattern.includes('[')) {
    const parts = path.split('/');
    // Check each directory component
    for (let i = 0; i < parts.length; i++) {
      if (parts[i] === pattern) {
        // If it's a directory (not the last component), it matches
        if (i < parts.length - 1) {
          return true;
        }
      }
    }
  }
  return false;
}

/**
 * Check if a path matches a gitignore pattern
 * @param path The file path to test
 * @param pattern The gitignore pattern
 * @returns true if the path matches the pattern
 */
export function matchesGitignorePattern(path: string, pattern: string): boolean {
  // Handle directory patterns (ending with /)
  if (pattern.endsWith('/')) {
    const dirPattern = pattern.slice(0, -1);
    // Match the directory itself or files within it
    return path === dirPattern || path.startsWith(dirPattern + '/');
  }
  
  // Handle root-relative patterns (starting with /)
  if (pattern.startsWith('/')) {
    const rootPattern = pattern.slice(1);
    return minimatch(path, rootPattern, { dot: true, matchBase: false });
  }
  
  // Handle ** patterns specially
  if (pattern.includes('**/')) {
    return minimatch(path, pattern, { dot: true });
  }
  
  // Handle patterns with path separators
  if (pattern.includes('/')) {
    // Direct match
    if (minimatch(path, pattern, { dot: true, matchBase: false })) {
      return true;
    }
    // Try with ** prefix for nested matches
    if (!pattern.startsWith('**/')) {
      return minimatch(path, '**/' + pattern, { dot: true });
    }
    return false;
  }
  
  // Simple patterns (no path separators)
  // These should match basename or directory names anywhere
  const basename = path.split('/').pop() || '';
  
  // Check basename match
  if (minimatch(basename, pattern, { dot: true })) {
    return true;
  }
  
  // Check if it matches as a directory
  return matchesAsDirectory(path, pattern);
}

/**
 * Filter an array of file paths based on gitignore patterns
 * @param filePaths Array of file paths to filter
 * @param patterns Gitignore patterns to apply
 * @returns Filtered array of file paths
 */
export function filterByGitignore(filePaths: string[], patterns: string[]): string[] {
  return filePaths.filter(path => !shouldExclude(path, patterns));
}