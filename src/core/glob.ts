/**
 * Main glob function with gitignore support - Core version
 */
import { relative, join } from "../path-utils.js";
import type { Dirent, FileSystemInterface, CoreGlobOptions } from "../types.js";
import { preprocessPatterns } from "./preprocess.js";
import { filterByGitignore } from "./postprocess.js";
import { collectGitignorePatterns, findGitignoreInDir } from "./gitignore-files.js";
import { walk } from "./walk.js";
import { minimatch } from "minimatch";

/**
 * Process glob entries and collect paths with dirent mapping
 */
async function collectGlobEntries(
  pattern: string,
  absoluteCwd: string,
  _earlyExclude: string[],
  withFileTypes: boolean,
  options: CoreGlobOptions
): Promise<{ allPaths: string[]; direntMap: Map<string, Dirent> }> {
  const allPaths: string[] = [];
  const direntMap = new Map<string, Dirent>();
  
  // Use walk function to traverse directories
  for await (const entry of walk({ ...options, withFileTypes: true })) {
    const dirent = entry;
    // For compatibility, construct the relative path
    const parentPath = (dirent as any).parentPath || '.';
    const relativePath = relative(absoluteCwd, join(parentPath, dirent.name));
    
    // Check if path matches the glob pattern
    if (minimatch(relativePath, pattern)) {
      if (withFileTypes) {
        allPaths.push(relativePath);
        direntMap.set(relativePath, dirent);
      } else {
        allPaths.push(relativePath);
      }
    }
  }
  
  return { allPaths, direntMap };
}

/**
 * Find all relevant .gitignore files from the given directory up
 */
async function findRelevantGitignoreFiles(
  absoluteCwd: string,
  fs: FileSystemInterface
): Promise<string[]> {
  const gitignoreFiles: string[] = [];
  let currentPath = absoluteCwd;
  
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
  absoluteCwd: string,
  additionalGitignoreFiles: string[] | undefined,
  fs: FileSystemInterface
): Promise<string[]> {
  const allPatterns: string[] = [];
  
  // Process additional gitignore files first (lower priority)
  if (additionalGitignoreFiles) {
    for (const gitignorePath of additionalGitignoreFiles) {
      const patterns = await collectGitignorePatterns(gitignorePath, absoluteCwd, fs);
      allPatterns.push(...patterns);
    }
  }
  
  // Process project gitignore files (higher priority)
  for (const gitignorePath of relevantGitignoreFiles) {
    const patterns = await collectGitignorePatterns(gitignorePath, absoluteCwd, fs);
    allPatterns.push(...patterns);
  }
  
  return allPatterns;
}

/**
 * Glob with automatic .gitignore support - returns async generator
 * Core version that requires all options including fs
 */
export function glob(
  pattern: string, 
  options: CoreGlobOptions & { withFileTypes?: false }
): AsyncGenerator<string, void, unknown>;
export function glob(
  pattern: string, 
  options: CoreGlobOptions & { withFileTypes: true }
): AsyncGenerator<Dirent, void, unknown>;
export async function* glob(
  pattern: string, 
  options: CoreGlobOptions
): AsyncGenerator<string | Dirent, void, unknown> {
  const { cwd: absoluteCwd, fs, withFileTypes = false } = options;
  
  // Find all relevant .gitignore files
  const relevantGitignoreFiles = await findRelevantGitignoreFiles(absoluteCwd, fs);
  
  // Collect all patterns from .gitignore files
  const allPatterns = await collectAllGitignorePatterns(
    relevantGitignoreFiles, 
    absoluteCwd,
    options.additionalGitignoreFiles,
    fs
  );
  
  // Preprocess patterns
  const { earlyExclude, postprocessPatterns } = preprocessPatterns(allPatterns || []);
  
  // Collect all entries
  const { allPaths, direntMap } = await collectGlobEntries(
    pattern,
    absoluteCwd,
    earlyExclude,
    withFileTypes,
    options
  );
  
  // Postprocess: filter files based on all gitignore patterns including negations
  const filteredPaths = filterByGitignore(allPaths, postprocessPatterns);
  
  // Yield filtered results
  for (const path of filteredPaths) {
    if (withFileTypes) {
      const dirent = direntMap.get(path);
      if (dirent) {
        yield dirent;
      }
    } else {
      yield path;
    }
  }
}