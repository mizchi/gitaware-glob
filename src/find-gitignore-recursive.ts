import { readdir } from "node:fs/promises";
import { join } from "node:path";

/**
 * Recursively find all .gitignore files in a directory tree
 */
export async function findGitignoreRecursive(dir: string): Promise<string[]> {
  const gitignoreFiles: string[] = [];
  
  async function walk(currentDir: string) {
    try {
      const entries = await readdir(currentDir, { withFileTypes: true });
      
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