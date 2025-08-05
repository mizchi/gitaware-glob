/**
 * Readdir with gitignore support - Core version
 */
import { join, relative } from "../path-utils.js";
import type { Dirent, FileSystemInterface, CoreReaddirOptions } from "../types.js";
import { collectGitignorePatterns, findGitignoreInDir, parseGitignoreToExclude } from "./gitignore-files.js";
import { filterByGitignore } from "./postprocess.js";

/**
 * Load local gitignore patterns if present
 */
async function loadLocalGitignorePatterns(
  dir: string,
  baseDir: string,
  patterns: string[],
  fs: FileSystemInterface
): Promise<string[]> {
  const gitignorePath = await findGitignoreInDir(dir, fs);
  if (!gitignorePath) {
    return patterns;
  }
  
  const relativeDirPath = relative(baseDir, dir);
  const localGitignorePatterns = await parseGitignoreToExclude(
    gitignorePath,
    relativeDirPath === '.' ? undefined : relativeDirPath,
    fs
  );
  return [...patterns, ...localGitignorePatterns];
}

/**
 * Process directory entry
 */
async function* processEntry(
  entry: Dirent,
  dir: string,
  baseDir: string,
  localPatterns: string[],
  options: CoreReaddirOptions,
  currentDepth: number = 0
): AsyncGenerator<{ path: string; dirent: Dirent; depth: number }, void, unknown> {
  const fullPath = join(dir, entry.name);
  const relativePath = relative(baseDir, fullPath);
  
  // Skip .git directory
  if (entry.name === '.git') return;
  
  // Check if this entry should be excluded by gitignore
  const shouldExclude = filterByGitignore([relativePath], localPatterns).length === 0;
  if (shouldExclude) return;
  
  // Add parent path for compatibility
  (entry as any).parentPath = dir;
  
  yield { path: relativePath, dirent: entry, depth: currentDepth };
  
  // Recursively process directories
  if (entry.isDirectory()) {
    const dirPath = relativePath + '/';
    if (filterByGitignore([dirPath], localPatterns).length > 0) {
      yield* readdirRecursive(fullPath, baseDir, localPatterns, options, currentDepth + 1);
    }
  }
}

/**
 * Read directory recursively with gitignore support
 */
async function* readdirRecursive(
  dir: string,
  baseDir: string,
  gitignorePatterns: string[],
  options: CoreReaddirOptions,
  currentDepth: number = 0
): AsyncGenerator<{ path: string; dirent: Dirent; depth: number }, void, unknown> {
  const { fs } = options;
  
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const localPatterns = await loadLocalGitignorePatterns(dir, baseDir, gitignorePatterns, fs);
    
    for (const entry of entries) {
      yield* processEntry(entry, dir, baseDir, localPatterns, options, currentDepth);
    }
  } catch (error: any) {
    // Ignore permission errors
    if (error.code !== 'EACCES' && error.code !== 'EPERM') {
      throw error;
    }
  }
}

/**
 * Find all relevant .gitignore files from the given directory up
 */
async function findRelevantGitignoreFiles(
  absolutePath: string,
  fs: FileSystemInterface
): Promise<string[]> {
  const gitignoreFiles: string[] = [];
  let currentPath = absolutePath;
  
  // Walk up directory tree looking for .gitignore files
  while (true) {
    const gitignorePath = await findGitignoreInDir(currentPath, fs);
    if (gitignorePath) {
      gitignoreFiles.push(gitignorePath);
    }
    
    // Move to parent directory
    const lastSlash = currentPath.lastIndexOf('/');
    if (lastSlash <= 0) {
      // Reached root
      break;
    }
    currentPath = currentPath.substring(0, lastSlash);
  }
  
  return gitignoreFiles;
}

/**
 * Collect all patterns from relevant .gitignore files
 */
async function collectAllGitignorePatterns(
  relevantGitignoreFiles: string[], 
  absolutePath: string,
  additionalGitignoreFiles: string[] | undefined,
  fs: FileSystemInterface
): Promise<string[]> {
  const allPatterns: string[] = [];
  
  // Process additional gitignore files first (lower priority)
  if (additionalGitignoreFiles) {
    for (const gitignorePath of additionalGitignoreFiles) {
      const patterns = await collectGitignorePatterns(gitignorePath, absolutePath, fs);
      allPatterns.push(...patterns);
    }
  }
  
  // Process project gitignore files (higher priority)
  for (const gitignorePath of relevantGitignoreFiles) {
    const patterns = await collectGitignorePatterns(gitignorePath, absolutePath, fs);
    allPatterns.push(...patterns);
  }
  
  return allPatterns;
}

/**
 * Read directory contents with automatic .gitignore support - Core version
 */
export function readdir(path: string, options: CoreReaddirOptions & { withFileTypes?: false }): Promise<string[]>;
export function readdir(path: string, options: CoreReaddirOptions & { withFileTypes: true }): Promise<Dirent[]>;
export async function readdir(path: string, options: CoreReaddirOptions): Promise<string[] | Dirent[]> {
  const { fs, withFileTypes = false, recursive = false } = options;
  const absolutePath = path;
  
  // Find relevant gitignore files
  const relevantGitignoreFiles = await findRelevantGitignoreFiles(absolutePath, fs);
  const gitignorePatterns = await collectAllGitignorePatterns(
    relevantGitignoreFiles,
    absolutePath,
    options.additionalGitignoreFiles,
    fs
  );
  
  const entries: Array<string | Dirent> = [];
  
  // Read directory recursively with gitignore support
  for await (const { path: relativePath, dirent, depth } of readdirRecursive(absolutePath, absolutePath, gitignorePatterns, options)) {
    // Skip entries deeper than requested
    if (!recursive && depth > 0) continue;
    
    if (withFileTypes) {
      entries.push(dirent);
    } else {
      entries.push(relativePath);
    }
  }
  
  // Sort entries to match standard readdir behavior
  entries.sort((a, b) => {
    const nameA = typeof a === 'string' ? a : a.name;
    const nameB = typeof b === 'string' ? b : b.name;
    return nameA.localeCompare(nameB);
  });
  
  return entries as any;
}