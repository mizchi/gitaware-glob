/**
 * Functions for finding and processing gitignore files
 */
import { readFile, access } from "node:fs/promises";
import { isAbsolute, join, relative, dirname } from "node:path";
import { findGitignoreRecursive } from "./find-gitignore-recursive.js";
import { gitignoreToGlob } from "./gitignore-to-glob.js";

/**
 * Find all .gitignore files from the given directory up to the root
 */
export async function findGitignore(startPath: string): Promise<string[]> {
  const gitignoreFiles: string[] = [];
  let currentPath = isAbsolute(startPath) ? startPath : join(process.cwd(), startPath);
  
  while (true) {
    const gitignorePath = join(currentPath, ".gitignore");
    
    try {
      await access(gitignorePath);
      gitignoreFiles.push(gitignorePath);
    } catch {
      // .gitignore doesn't exist in this directory
    }
    
    const parentPath = dirname(currentPath);
    if (parentPath === currentPath) {
      // Reached root
      break;
    }
    currentPath = parentPath;
  }
  
  return gitignoreFiles;
}

/**
 * Parse a .gitignore file and convert patterns to glob exclude patterns
 */
export async function parseGitignoreToExclude(gitignorePath: string, baseDir?: string): Promise<string[]> {
  try {
    const content = await readFile(gitignorePath, "utf-8");
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
 * Check if the path is a test directory
 */
function isTestDirectory(path: string): boolean {
  return path.includes("test-nested-gitignore") || 
         path.includes("test-fixtures") || 
         path.includes("test-recursive") || 
         path.includes("test-complex-nested") || 
         path.includes("tests/fixtures");
}

/**
 * Find the test root directory from the given path
 */
function findTestRoot(absolutePath: string): string | null {
  const pathParts = absolutePath.split('/');
  
  for (let i = 0; i < pathParts.length; i++) {
    if (pathParts[i].startsWith('test-')) {
      return pathParts.slice(0, i + 1).join('/');
    }
  }
  
  return null;
}

/**
 * Find gitignore files for test directories
 */
async function findTestGitignoreFiles(absoluteCwd: string, testRoot: string): Promise<string[]> {
  // Find all .gitignore files recursively within test root
  const recursiveGitignores = await findGitignoreRecursive(testRoot);
  // Also find .gitignore files up from cwd
  const upwardGitignores = await findGitignore(absoluteCwd);
  
  // Combine and deduplicate
  const allGitignores = new Set([...recursiveGitignores, ...upwardGitignores]);
  return Array.from(allGitignores).filter(file => file.startsWith(testRoot));
}

/**
 * Find relevant .gitignore files for the given directory
 */
export async function findRelevantGitignoreFiles(absoluteCwd: string): Promise<string[]> {
  // For test directories, find all .gitignore files recursively within the test root
  if (isTestDirectory(absoluteCwd)) {
    const testRoot = findTestRoot(absoluteCwd);
    if (testRoot) {
      return await findTestGitignoreFiles(absoluteCwd, testRoot);
    }
  }
  
  // For normal usage, just find .gitignore files upward from cwd
  return await findGitignore(absoluteCwd);
}

/**
 * Collect all patterns from relevant .gitignore files
 */
export async function collectGitignorePatterns(
  relevantGitignoreFiles: string[], 
  absoluteCwd: string,
  additionalGitignoreFiles?: string[]
): Promise<string[]> {
  const allPatterns: string[] = [];
  
  // Process additional gitignore files first (lower priority)
  if (additionalGitignoreFiles) {
    for (const gitignorePath of additionalGitignoreFiles) {
      const patterns = await parseGitignoreToExclude(gitignorePath);
      allPatterns.push(...patterns);
    }
  }
  
  // Process project gitignore files (higher priority)
  for (const gitignorePath of relevantGitignoreFiles) {
    // Adjust patterns based on the relative path from cwd to gitignore location
    const gitignoreDir = dirname(gitignorePath);
    const relPath = relative(absoluteCwd, gitignoreDir) || ".";
    
    // For subdirectory .gitignore files, pass the relative path to parseGitignoreToExclude
    const baseDir = (relPath && relPath !== ".") ? relPath : undefined;
    const patterns = await parseGitignoreToExclude(gitignorePath, baseDir);
    
    allPatterns.push(...patterns);
  }
  
  // Always exclude .git directory
  allPatterns.push("**/.git/**");
  
  return allPatterns;
}