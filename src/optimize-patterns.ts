/**
 * Optimize gitignore patterns for glob exclude
 * 
 * Strategy:
 * 1. Expand directory patterns (e.g., "dir" -> ["dir", "dir/**"])
 * 2. Keep negation patterns as-is for post-processing
 * 3. Convert gitignore syntax to glob syntax
 */

import { matchesPattern } from "./pattern-utils.js";
import { OptimizedPatterns } from "./types.js";

export function optimizeGitignorePatterns(patterns: string[]): OptimizedPatterns {
  const exclude: string[] = [];
  const negations: string[] = [];
  
  for (const pattern of patterns) {
    if (pattern.startsWith("!")) {
      // Negation patterns need post-processing
      negations.push(pattern);
      continue;
    }
    
    // Expand directory patterns for direct exclusion
    if (!pattern.includes("*") && !pattern.includes("/")) {
      // Simple directory/file name without wildcards
      // e.g., "node_modules" -> exclude both file and directory
      exclude.push(pattern);
      exclude.push(pattern + "/**");
    } else if (pattern.endsWith("/")) {
      // Explicit directory pattern
      // e.g., "dist/" -> "dist/**"
      const dirName = pattern.slice(0, -1);
      exclude.push(dirName);
      exclude.push(dirName + "/**");
    } else if (pattern.startsWith("**/")) {
      // Already a glob pattern
      exclude.push(pattern);
    } else if (pattern.startsWith("/")) {
      // Root-relative pattern
      exclude.push(pattern.slice(1));
    } else if (pattern.includes("/") && !pattern.includes("**")) {
      // Path pattern without ** - add it for proper matching
      exclude.push(pattern);
      exclude.push("**/" + pattern);
    } else {
      // Other patterns
      exclude.push(pattern);
    }
  }
  
  return { exclude, negations };
}

/**
 * Check if path matches a specific negation pattern
 */
function matchesNegationPattern(path: string, pattern: string): boolean {
  // Exact match
  if (pattern === path) {
    return true;
  }
  
  // Directory pattern
  if (pattern.endsWith("/")) {
    const dir = pattern.slice(0, -1);
    return path === dir || path.startsWith(dir + "/");
  }
  
  // Handle **/ patterns
  if (pattern.includes("**/")) {
    if (pattern.startsWith("**/")) {
      const subPattern = pattern.slice(3);
      return path === subPattern || path.endsWith("/" + subPattern);
    }
    return matchesPattern(path, pattern);
  }
  
  // Wildcard patterns
  if (pattern.includes("*") || pattern.includes("?")) {
    return matchesPattern(path, pattern);
  }
  
  // Path pattern - only exact match
  if (pattern.includes("/")) {
    return path === pattern;
  }
  
  // Simple filename - can match basename
  return path === pattern || path.endsWith("/" + pattern);
}

/**
 * Check if a path should be included based on negation patterns
 */
export function checkNegationPatterns(path: string, negations: string[]): boolean {
  // If no negations, path is excluded
  if (negations.length === 0) {
    return false;
  }
  
  // Check each negation pattern
  for (const negation of negations) {
    const pattern = negation.slice(1); // Remove !
    if (matchesNegationPattern(path, pattern)) {
      return true;
    }
  }
  
  return false;
}