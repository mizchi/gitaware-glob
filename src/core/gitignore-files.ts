/**
 * Functions for finding and processing gitignore files - Core version
 */
import { join, relative } from "../path-utils.js";
import { gitignoreToGlob } from "./gitignore-to-glob.js";
import type { FileSystemInterface } from "../types.js";

/**
 * Parse a .gitignore file and convert patterns to glob exclude patterns
 */
export async function parseGitignoreToExclude(
  gitignorePath: string, 
  baseDir: string | undefined, 
  fs: FileSystemInterface
): Promise<string[]> {
  try {
    const content = await fs.readFile(gitignorePath, "utf-8");
    const lines = content.split("\n");
    const patterns: string[] = [];
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }
      
      let pattern = trimmed;
      let isNegation = false;
      
      // Handle negation
      if (pattern.startsWith("!")) {
        isNegation = true;
        pattern = pattern.slice(1);
      }
      
      // Convert gitignore pattern to glob patterns
      const globPatterns = gitignoreToGlob(isNegation ? '!' + pattern : pattern, baseDir);
      patterns.push(...globPatterns);
    }
    
    return patterns;
  } catch {
    return [];
  }
}

/**
 * Find a .gitignore file in the given directory
 */
export async function findGitignoreInDir(dir: string, fs: FileSystemInterface): Promise<string | null> {
  const gitignorePath = join(dir, ".gitignore");
  
  try {
    await fs.access(gitignorePath);
    return gitignorePath;
  } catch {
    return null;
  }
}

/**
 * Collect all patterns from gitignore files
 */
export async function collectGitignorePatterns(
  gitignorePath: string,
  absoluteCwd: string,
  fs: FileSystemInterface
): Promise<string[]> {
  const allPatterns: string[] = [];
  
  // Get directory of gitignore file
  const gitignoreDir = gitignorePath.substring(0, gitignorePath.lastIndexOf('/'));
  const relPath = relative(absoluteCwd, gitignoreDir) || ".";
  
  // For subdirectory .gitignore files, pass the relative path
  const baseDir = (relPath && relPath !== ".") ? relPath : undefined;
  const patterns = await parseGitignoreToExclude(gitignorePath, baseDir, fs);
  
  allPatterns.push(...patterns);
  
  // Always exclude .git directory
  allPatterns.push("**/.git/**");
  
  return allPatterns;
}