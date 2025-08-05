/**
 * Common utilities for pattern matching and conversion
 */

/**
 * Convert a gitignore pattern to a regular expression
 * @param pattern The pattern to convert
 * @returns A regular expression string
 */
export function patternToRegex(pattern: string): string {
  let regexStr = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  
  // Use placeholders to avoid conflicts during replacement
  regexStr = regexStr.replace(/\*\*\//g, '__STARSTAR_SLASH__');
  regexStr = regexStr.replace(/\/\*\*/g, '__SLASH_STARSTAR__');
  regexStr = regexStr.replace(/\*\*/g, '__STARSTAR__');
  regexStr = regexStr.replace(/\*/g, '__STAR__');
  regexStr = regexStr.replace(/\?/g, '__QUESTION__');
  
  // Replace placeholders with regex patterns
  regexStr = regexStr.replace(/__STARSTAR_SLASH__/g, '(.*/)?');  // **/ = optional path prefix
  regexStr = regexStr.replace(/__SLASH_STARSTAR__/g, '/.*');     // /** = match everything after
  regexStr = regexStr.replace(/__STARSTAR__/g, '.*');              // ** = match anything
  regexStr = regexStr.replace(/__STAR__/g, '[^/]*');               // * = match anything except /
  regexStr = regexStr.replace(/__QUESTION__/g, '[^/]');            // ? = match single char except /
  
  return regexStr;
}

/**
 * Check if a path matches a pattern
 * @param path The path to test
 * @param pattern The pattern to match against
 * @returns True if the path matches the pattern
 */
export function matchesPattern(path: string, pattern: string): boolean {
  if (pattern.includes("**") || pattern.includes("*") || pattern.includes("?")) {
    const regex = patternToRegex(pattern);
    return new RegExp("^" + regex + "$").test(path);
  }
  // Literal pattern - check exact match or directory prefix
  return path === pattern || path.startsWith(pattern + "/");
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