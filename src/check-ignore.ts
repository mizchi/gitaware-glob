/**
 * Check gitignore with detailed reason information
 * Similar to git check-ignore -v functionality
 */

import { promises as fs } from "node:fs";
import { isAbsolute, join, relative, dirname } from "node:path";
import { findGitignoreInternal } from "./gitignore.js";
import { matchesGitignorePattern } from "./core/postprocess.js";
import type { FileSystemInterface, GlobOptions, InternalOptions, GitignoreReason } from "./types.js";

/**
 * Parse a .gitignore file and return patterns with line numbers
 */
async function parseGitignoreWithLineNumbers(
  gitignorePath: string,
  fileSystem: FileSystemInterface
): Promise<Array<{pattern: string, lineNumber: number}>> {
  try {
    const content = await fileSystem.readFile(gitignorePath, "utf-8");
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
  const relativePath = relative(basePath, path) || ".";
  
  // Remove negation prefix for matching
  const isNegation = pattern.startsWith("!");
  const cleanPattern = isNegation ? pattern.slice(1) : pattern;
  
  // Use the shared matching logic
  return matchesGitignorePattern(relativePath, cleanPattern);
}

/**
 * Process gitignore patterns and find matches
 */
function processGitignoreFile(
  gitignoreFile: string,
  absoluteFilePath: string,
  workingDir: string,
  patterns: Array<{pattern: string, lineNumber: number}>,
  ignoredDirs: Map<string, GitignoreReason>,
  lastMatch: GitignoreReason | null
): GitignoreReason | null {
  const gitignoreDir = dirname(gitignoreFile);
  let match = lastMatch;
  
  for (const { pattern, lineNumber } of patterns) {
    if (matchesPattern(absoluteFilePath, pattern, gitignoreDir)) {
      const isNegation = pattern.startsWith("!");
      
      const reason = {
        gitignoreFile: relative(workingDir, gitignoreFile) || ".",
        lineNumber,
        pattern,
        filePath: relative(workingDir, absoluteFilePath) || ".",
        ignored: !isNegation
      };
      
      // Check if the file is in an ignored directory
      for (const [ignoredDir, dirReason] of ignoredDirs) {
        if (absoluteFilePath.startsWith(ignoredDir + '/') || dirname(absoluteFilePath) === ignoredDir) {
          // File is in an ignored directory, return the directory ignore reason
          return dirReason;
        }
      }
      
      // If it's a directory pattern that matches a parent of our file, track it
      if (!isNegation && pattern.endsWith('/')) {
        const dirPattern = pattern.slice(0, -1);
        const absoluteDirPattern = join(gitignoreDir, dirPattern);
        // Check if this pattern matches any parent directory of our file
        if (absoluteFilePath.startsWith(absoluteDirPattern + '/')) {
          ignoredDirs.set(absoluteDirPattern, reason);
        }
      }
      
      match = reason;
    }
  }
  
  return match;
}

/**
 * Internal function with resolved options
 */
async function checkGitignoreReasonInternal(
  filePath: string,
  options: InternalOptions
): Promise<GitignoreReason | null> {
  const { fs: fileSystem, cwd: workingDir } = options;
  const absoluteFilePath = isAbsolute(filePath) ? filePath : join(workingDir, filePath);
  
  // Find all .gitignore files from the file's directory up to root
  const gitignoreFiles = await findGitignoreInternal(dirname(absoluteFilePath), options);
  
  let lastMatch: GitignoreReason | null = null;
  
  // Track which directories are ignored and their patterns
  const ignoredDirs = new Map<string, GitignoreReason>();
  
  // Process gitignore files from root to leaf (reverse order)
  for (const gitignoreFile of gitignoreFiles.reverse()) {
    const gitignoreDir = dirname(gitignoreFile);
    
    // Skip .gitignore files in ignored directories (Git behavior)
    let skipThisGitignore = false;
    for (const [ignoredDir] of ignoredDirs) {
      if (gitignoreDir.startsWith(ignoredDir + '/') || gitignoreDir === ignoredDir) {
        skipThisGitignore = true;
        break;
      }
    }
    
    if (skipThisGitignore) {
      continue;
    }
    
    const patterns = await parseGitignoreWithLineNumbers(gitignoreFile, fileSystem);
    const match = processGitignoreFile(
      gitignoreFile,
      absoluteFilePath,
      workingDir,
      patterns,
      ignoredDirs,
      lastMatch
    );
    
    if (match) {
      lastMatch = match;
    }
  }
  
  // Return the last match, which represents the final decision
  return lastMatch && lastMatch.ignored ? lastMatch : lastMatch;
}

/**
 * Check which gitignore pattern matches a file and why
 * Similar to `git check-ignore -v`
 * 
 * @param filePath The file path to check
 * @param cwdOrOptions Current working directory (string) or options object
 * @returns The reason for ignore, or null if not ignored
 */
export function checkGitignoreReason(
  filePath: string, 
  cwdOrOptions?: string | GlobOptions
): Promise<GitignoreReason | null> {
  const options = typeof cwdOrOptions === 'string' ? { cwd: cwdOrOptions } : cwdOrOptions;
  const workingDir = options?.cwd || process.cwd();
  const fileSystem = options?.fs || fs;
  
  const internalOptions: InternalOptions = {
    fs: fileSystem,
    cwd: isAbsolute(workingDir) ? workingDir : join(process.cwd(), workingDir),
    additionalGitignoreFiles: options?.additionalGitignoreFiles
  };
  
  return checkGitignoreReasonInternal(filePath, internalOptions);
}

/**
 * Format the gitignore reason in the same format as `git check-ignore -v`
 * @param reason The gitignore reason
 * @returns Formatted string like ".gitignore:1:*.log\ttest.log"
 */
export function formatGitignoreReason(reason: GitignoreReason): string {
  return `${reason.gitignoreFile}:${reason.lineNumber}:${reason.pattern}\t${reason.filePath}`;
}