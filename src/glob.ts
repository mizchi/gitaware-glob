/**
 * Main glob function with gitignore support
 */
import { glob as fsGlob } from "node:fs/promises";
import { Dirent } from "node:fs";
import { relative, isAbsolute, join } from "node:path";
import { GlobOptions } from "./types.js";
import { preprocessPatterns } from "./preprocess.js";
import { filterByGitignore } from "./postprocess.js";
import { findRelevantGitignoreFiles, collectGitignorePatterns } from "./gitignore-files.js";

/**
 * Process glob entries and collect paths with dirent mapping
 */
async function collectGlobEntries(
  pattern: string,
  absoluteCwd: string,
  earlyExclude: string[],
  withFileTypes: boolean
): Promise<{ allPaths: string[]; direntMap: Map<string, Dirent> }> {
  const allPaths: string[] = [];
  const direntMap = new Map<string, Dirent>();
  
  for await (const entry of fsGlob(pattern, {
    cwd: absoluteCwd,
    exclude: ['**/.git/**', ...earlyExclude],
    withFileTypes,
  })) {
    if (withFileTypes) {
      const dirent = entry as Dirent;
      // Store as relative path
      const relativePath = relative(absoluteCwd, dirent.parentPath + '/' + dirent.name);
      allPaths.push(relativePath);
      direntMap.set(relativePath, dirent);
    } else {
      allPaths.push(entry as string);
    }
  }
  
  return { allPaths, direntMap };
}

/**
 * Glob with automatic .gitignore support - returns async generator
 */
export function glob(
  pattern: string, 
  options?: GlobOptions & { withFileTypes?: false }
): AsyncGenerator<string, void, unknown>;
export function glob(
  pattern: string, 
  options: GlobOptions & { withFileTypes: true }
): AsyncGenerator<Dirent, void, unknown>;
export async function* glob(
  pattern: string, 
  options?: GlobOptions
): AsyncGenerator<string | Dirent, void, unknown> {
  const cwd = options?.cwd || process.cwd();
  const absoluteCwd = isAbsolute(cwd) ? cwd : join(process.cwd(), cwd);
  const withFileTypes = options?.withFileTypes ?? false;
  
  // Find all relevant .gitignore files
  const relevantGitignoreFiles = await findRelevantGitignoreFiles(absoluteCwd);
  
  // Collect all patterns from .gitignore files
  const allPatterns = await collectGitignorePatterns(
    relevantGitignoreFiles, 
    absoluteCwd,
    options?.additionalGitignoreFiles
  );
  
  // Preprocess patterns
  const { earlyExclude, postprocessPatterns } = preprocessPatterns(allPatterns || []);
  
  // Collect all entries
  const { allPaths, direntMap } = await collectGlobEntries(
    pattern,
    absoluteCwd,
    earlyExclude,
    withFileTypes
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