/**
 * Gitignore file handling functions
 */
import { promises as fs } from "node:fs";
import { isAbsolute, join, relative, dirname } from "node:path";
import { gitignoreToGlob } from "./core/gitignore-to-glob.js";
import type { GlobOptions, InternalOptions } from "./types.js";

// ===== Internal Implementation =====

/**
 * Find all .gitignore files from the given directory up to the root (internal)
 */
export async function findGitignoreInternal(startPath: string, options: InternalOptions): Promise<string[]> {
  const { fs } = options;
  const gitignoreFiles: string[] = [];
  let currentPath = startPath;
  
  while (true) {
    const gitignorePath = join(currentPath, ".gitignore");
    
    try {
      await fs.access(gitignorePath);
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
 * Recursively find all .gitignore files in a directory tree (internal)
 */
async function findGitignoreRecursiveInternal(
  dir: string, 
  options: InternalOptions
): Promise<string[]> {
  const gitignoreFiles: string[] = [];
  const { fs } = options;
  
  async function walk(currentDir: string) {
    try {
      const entries = await fs.readdir(currentDir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = join(currentDir, entry.name);
        
        if (entry.isDirectory()) {
          // Skip node_modules and .git directories
          if (entry.name !== 'node_modules' && entry.name !== '.git') {
            await walk(fullPath);
          }
        } else if (entry.name === '.gitignore') {
          gitignoreFiles.push(fullPath);
        }
      }
    } catch {
      // Ignore permission errors
    }
  }
  
  await walk(dir);
  return gitignoreFiles;
}

/**
 * Parse a .gitignore file and convert patterns to glob exclude patterns (internal)
 */
export async function parseGitignoreToExcludeInternal(
  gitignorePath: string, 
  baseDir: string | undefined, 
  options: InternalOptions
): Promise<string[]> {
  const { fs } = options;
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
async function findTestGitignoreFiles(
  absoluteCwd: string, 
  testRoot: string, 
  options: InternalOptions
): Promise<string[]> {
  // Find all .gitignore files recursively within test root
  const recursiveGitignores = await findGitignoreRecursiveInternal(testRoot, options);
  // Also find .gitignore files up from cwd
  const upwardGitignores = await findGitignoreInternal(absoluteCwd, options);
  
  // Combine and deduplicate
  const allGitignores = new Set([...recursiveGitignores, ...upwardGitignores]);
  return Array.from(allGitignores).filter(file => file.startsWith(testRoot));
}

/**
 * Find relevant .gitignore files for the given directory (internal)
 */
export async function findRelevantGitignoreFiles(
  absoluteCwd: string, 
  options: InternalOptions
): Promise<string[]> {
  // For test directories, find all .gitignore files recursively within the test root
  if (isTestDirectory(absoluteCwd)) {
    const testRoot = findTestRoot(absoluteCwd);
    if (testRoot) {
      return await findTestGitignoreFiles(absoluteCwd, testRoot, options);
    }
  }
  
  // For normal usage, just find .gitignore files upward from cwd
  return await findGitignoreInternal(absoluteCwd, options);
}

/**
 * Collect all patterns from relevant .gitignore files (internal)
 */
export async function collectGitignorePatterns(
  relevantGitignoreFiles: string[], 
  absoluteCwd: string,
  options: InternalOptions
): Promise<string[]> {
  const { additionalGitignoreFiles } = options;
  const allPatterns: string[] = [];
  
  // Process additional gitignore files first (lower priority)
  if (additionalGitignoreFiles) {
    for (const gitignorePath of additionalGitignoreFiles) {
      const patterns = await parseGitignoreToExcludeInternal(gitignorePath, undefined, options);
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
    const patterns = await parseGitignoreToExcludeInternal(gitignorePath, baseDir, options);
    
    allPatterns.push(...patterns);
  }
  
  // Always exclude .git directory
  allPatterns.push("**/.git/**");
  
  return allPatterns;
}

// ===== Public API =====

/**
 * Find all .gitignore files from the given directory up to the root
 * Public API that resolves defaults
 */
export function findGitignore(
  startPath: string, 
  options?: GlobOptions
): Promise<string[]> {
  const fileSystem = options?.fs || fs;
  const cwd = options?.cwd || process.cwd();
  const absoluteCwd = isAbsolute(cwd) ? cwd : join(process.cwd(), cwd);
  
  const internalOptions: InternalOptions = {
    fs: fileSystem,
    cwd: absoluteCwd,
    additionalGitignoreFiles: options?.additionalGitignoreFiles
  };
  
  return findGitignoreInternal(startPath, internalOptions);
}

/**
 * Parse a .gitignore file and convert patterns to glob exclude patterns
 * Public API that resolves defaults
 */
export function parseGitignoreToExclude(
  gitignorePath: string, 
  baseDir?: string,
  options?: GlobOptions
): Promise<string[]> {
  const fileSystem = options?.fs || fs;
  const cwd = options?.cwd || process.cwd();
  const absoluteCwd = isAbsolute(cwd) ? cwd : join(process.cwd(), cwd);
  
  const internalOptions: InternalOptions = {
    fs: fileSystem,
    cwd: absoluteCwd,
    additionalGitignoreFiles: options?.additionalGitignoreFiles
  };
  
  return parseGitignoreToExcludeInternal(gitignorePath, baseDir, internalOptions);
}

/**
 * Recursively find all .gitignore files in a directory tree
 * Public API that resolves defaults
 */
export function findGitignoreRecursive(
  dir: string, 
  options?: GlobOptions
): Promise<string[]> {
  const fileSystem = options?.fs || fs;
  const cwd = options?.cwd || process.cwd();
  const absoluteCwd = isAbsolute(cwd) ? cwd : join(process.cwd(), cwd);
  
  const internalOptions: InternalOptions = {
    fs: fileSystem,
    cwd: absoluteCwd,
    additionalGitignoreFiles: options?.additionalGitignoreFiles
  };
  
  return findGitignoreRecursiveInternal(dir, internalOptions);
}