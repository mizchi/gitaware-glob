/**
 * Parse gitignore patterns into structured format
 */
import { GitignorePattern } from "./types.js";

/**
 * Parse a gitignore pattern string into a structured GitignorePattern
 */
export function parseGitignorePattern(line: string): GitignorePattern | null {
  const trimmed = line.trim();
  
  // Skip empty lines and comments
  if (!trimmed || trimmed.startsWith("#")) {
    return null;
  }
  
  // .gitignore itself should never be ignored
  if (trimmed === ".gitignore") {
    return null;
  }
  
  let pattern = trimmed;
  let isNegation = false;
  
  // Handle negation
  if (pattern.startsWith("!")) {
    isNegation = true;
    pattern = pattern.slice(1);
  }
  
  // Determine pattern properties
  const isDirectory = pattern.endsWith("/");
  const isRootRelative = pattern.startsWith("/");
  
  return {
    pattern: trimmed,
    isNegation,
    isDirectory,
    isRootRelative
  };
}

/**
 * Parse gitignore content into an array of patterns
 */
export function parseGitignoreContent(content: string): GitignorePattern[] {
  const lines = content.split("\n");
  const patterns: GitignorePattern[] = [];
  
  for (const line of lines) {
    const pattern = parseGitignorePattern(line);
    if (pattern) {
      patterns.push(pattern);
    }
  }
  
  return patterns;
}