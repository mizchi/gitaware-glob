import { readdir } from "node:fs/promises";
import { joinPath } from "./path-utils.js";

/**
 * Recursively find all .gitignore files in a directory tree
 */
export async function findGitignoreRecursive(dir: string): Promise<string[]> {
  const gitignoreFiles: string[] = [];
  
  async function walk(currentDir: string) {
    try {
      const entries = await readdir(currentDir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = joinPath(currentDir, entry.name);
        
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