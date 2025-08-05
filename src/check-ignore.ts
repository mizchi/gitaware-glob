/**
 * Check gitignore with detailed reason information
 * Similar to git check-ignore -v functionality
 */

import { readFile } from "node:fs/promises";
import { toAbsolutePath, getRelativePath, getParentDirectory } from "./path-utils.js";
import { findGitignore } from "./gitignore-files.js";
import { matchesGitignorePattern } from "./postprocess.js";

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

/**
 * Parse a .gitignore file and return patterns with line numbers
 */
async function parseGitignoreWithLineNumbers(gitignorePath: string): Promise<Array<{pattern: string, lineNumber: number}>> {
  try {
    const content = await readFile(gitignorePath, "utf-8");
    const lines = content.split("\n");
    const patterns: Array<{pattern: string, lineNumber: number}> = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      // Skip empty lines and comments
      if (line && !line.startsWith("#")) {
        patterns.push({
          pattern: line,
          lineNumber: i + 1  // 1-based line numbers
        });
      }
    }
    
    return patterns;
  } catch {
    return [];
  }
}

/**
 * Check if a path matches a gitignore pattern
 * Uses matchesGitignorePattern from postprocess.ts for consistency
 */
function matchesPattern(path: string, pattern: string, basePath: string): boolean {
  const relativePath = getRelativePath(basePath, path);
  
  // Remove negation prefix for matching
  const isNegation = pattern.startsWith("!");
  const cleanPattern = isNegation ? pattern.slice(1) : pattern;
  
  // Use the shared matching logic
  return matchesGitignorePattern(relativePath, cleanPattern);
}

/**
 * Check which gitignore pattern matches a file and why
 * Similar to `git check-ignore -v`
 * 
 * @param filePath The file path to check
 * @param cwd Current working directory
 * @returns The reason for ignore, or null if not ignored
 */
export async function checkGitignoreReason(filePath: string, cwd?: string): Promise<GitignoreReason | null> {
  const workingDir = cwd || process.cwd();
  const absoluteFilePath = toAbsolutePath(filePath, workingDir);
  
  // Find all .gitignore files from the file's directory up to root
  const gitignoreFiles = await findGitignore(getParentDirectory(absoluteFilePath));
  
  let lastMatch: GitignoreReason | null = null;
  
  // Process gitignore files from root to leaf (reverse order)
  for (const gitignoreFile of gitignoreFiles.reverse()) {
    const patterns = await parseGitignoreWithLineNumbers(gitignoreFile);
    const gitignoreDir = getParentDirectory(gitignoreFile);
    
    for (const { pattern, lineNumber } of patterns) {
      if (matchesPattern(absoluteFilePath, pattern, gitignoreDir)) {
        const isNegation = pattern.startsWith("!");
        
        lastMatch = {
          gitignoreFile: getRelativePath(workingDir, gitignoreFile),
          lineNumber,
          pattern,
          filePath: getRelativePath(workingDir, absoluteFilePath),
          ignored: !isNegation
        };
        
        // For negation patterns, we need to continue checking
        // For normal patterns, we can update but continue to find the most specific match
      }
    }
  }
  
  // Return the last match, which represents the final decision
  return lastMatch && lastMatch.ignored ? lastMatch : lastMatch;
}

/**
 * Format the gitignore reason in the same format as `git check-ignore -v`
 * @param reason The gitignore reason
 * @returns Formatted string like ".gitignore:1:*.log\ttest.log"
 */
export function formatGitignoreReason(reason: GitignoreReason): string {
  return `${reason.gitignoreFile}:${reason.lineNumber}:${reason.pattern}\t${reason.filePath}`;
}