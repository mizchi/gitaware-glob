/**
 * Test utilities for converting async generator to array
 */
import { glob as globGenerator } from "../src/index.js";
import { GlobOptions } from "../src/types.js";

/**
 * Helper function to convert glob async generator to array
 * Used in tests for backward compatibility
 */
export async function glob(pattern: string, options?: GlobOptions): Promise<string[]> {
  const results: string[] = [];
  
  if (options?.withFileTypes === true) {
    // When withFileTypes is true, we get Dirent objects
    for await (const dirent of globGenerator(pattern, { ...options, withFileTypes: true })) {
      // For Dirent objects, construct the full path
      const fullPath = dirent.parentPath ? `${dirent.parentPath}/${dirent.name}` : dirent.name;
      results.push(fullPath);
    }
  } else {
    // When withFileTypes is false or undefined, we get strings
    for await (const path of globGenerator(pattern, { ...options, withFileTypes: false })) {
      results.push(path);
    }
  }
  
  return results;
}