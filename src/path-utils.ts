/**
 * Common path utilities for gitignore processing
 */
import { isAbsolute, join, dirname, relative } from "node:path";

/**
 * Convert a path to absolute path
 */
export function toAbsolutePath(path: string, basePath?: string): string {
  if (isAbsolute(path)) {
    return path;
  }
  return join(basePath || process.cwd(), path);
}

/**
 * Get the relative path from base to target
 */
export function getRelativePath(from: string, to: string): string {
  const rel = relative(from, to);
  return rel || ".";
}

/**
 * Get parent directory path
 */
export function getParentDirectory(path: string): string {
  return dirname(path);
}

/**
 * Join path segments
 */
export function joinPath(...segments: string[]): string {
  return join(...segments);
}