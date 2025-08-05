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
  return Array.fromAsync(globGenerator(pattern, options));
}