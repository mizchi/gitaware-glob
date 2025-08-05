/**
 * gitaware-glob core module - Browser-compatible version without Node.js dependencies
 * 
 * This module requires all options including fs to be provided explicitly.
 * It does not reference node:fs and can be used in browser environments with
 * compatible file system implementations.
 */

export { glob } from "./glob.js";
export { walk } from "./walk.js";
export { readdir } from "./readdir.js";

export type {
  FileSystemInterface,
  Dirent,
  StatsBase,
  CoreGlobOptions,
  CoreReaddirOptions,
  OptimizedPatterns,
  GitignorePattern,
  ParsedGitignore,
  GitignoreProcessingResult
} from "../types.js";

// Re-export utility functions that might be useful
export { gitignoreToGlob } from "./gitignore-to-glob.js";
export { filterByGitignore, matchesGitignorePattern } from "./postprocess.js";