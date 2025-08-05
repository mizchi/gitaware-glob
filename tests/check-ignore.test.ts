import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { checkGitignoreReason, formatGitignoreReason } from "../src/check-ignore.js";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

describe("checkGitignoreReason", () => {
  const testDir = join(process.cwd(), "test-check-ignore");
  
  beforeAll(async () => {
    // Create test directory structure
    await mkdir(testDir, { recursive: true });
    await mkdir(join(testDir, "src"), { recursive: true });
    await mkdir(join(testDir, "dist"), { recursive: true });
    
    // Initialize git repo for comparison
    await execAsync("git init", { cwd: testDir });
    
    // Create .gitignore files
    await writeFile(join(testDir, ".gitignore"), `# Root gitignore
*.log
dist/
.env
!important.log
`);
    
    await writeFile(join(testDir, "src", ".gitignore"), `# Src gitignore
*.test.ts
!critical.test.ts
temp/
`);
    
    // Create test files
    await writeFile(join(testDir, "test.log"), "log content");
    await writeFile(join(testDir, "important.log"), "important log");
    await writeFile(join(testDir, ".env"), "SECRET=123");
    await writeFile(join(testDir, "dist", "bundle.js"), "compiled");
    await writeFile(join(testDir, "src", "app.ts"), "app code");
    await writeFile(join(testDir, "src", "app.test.ts"), "test code");
    await writeFile(join(testDir, "src", "critical.test.ts"), "critical test");
  });
  
  afterAll(async () => {
    await rm(testDir, { recursive: true, force: true });
  });
  
  it("should match simple wildcard patterns", async () => {
    const reason = await checkGitignoreReason(join(testDir, "test.log"), testDir);
    expect(reason).toBeTruthy();
    expect(reason?.pattern).toBe("*.log");
    expect(reason?.ignored).toBe(true);
    expect(formatGitignoreReason(reason!)).toMatch(/\.gitignore:2:\*\.log\ttest\.log/);
  });
  
  it("should handle negation patterns", async () => {
    const reason = await checkGitignoreReason(join(testDir, "important.log"), testDir);
    expect(reason).toBeTruthy();
    expect(reason?.pattern).toBe("!important.log");
    expect(reason?.ignored).toBe(false);
  });
  
  it("should match directory patterns", async () => {
    const reason = await checkGitignoreReason(join(testDir, "dist", "bundle.js"), testDir);
    expect(reason).toBeTruthy();
    expect(reason?.pattern).toBe("dist/");
    expect(reason?.ignored).toBe(true);
  });
  
  it("should respect nested .gitignore files", async () => {
    const reason = await checkGitignoreReason(join(testDir, "src", "app.test.ts"), testDir);
    expect(reason).toBeTruthy();
    expect(reason?.pattern).toBe("*.test.ts");
    expect(reason?.gitignoreFile).toBe("src/.gitignore");
    expect(reason?.ignored).toBe(true);
  });
  
  it("should handle negation in nested .gitignore", async () => {
    const reason = await checkGitignoreReason(join(testDir, "src", "critical.test.ts"), testDir);
    expect(reason).toBeTruthy();
    expect(reason?.pattern).toBe("!critical.test.ts");
    expect(reason?.ignored).toBe(false);
  });
  
  it("should return null for non-ignored files", async () => {
    const reason = await checkGitignoreReason(join(testDir, "src", "app.ts"), testDir);
    expect(reason).toBeNull();
  });
  
  // Compare with actual git check-ignore -v
  it("should match git check-ignore -v output", async () => {
    const files = [
      "test.log",
      "important.log",
      ".env",
      "dist/bundle.js",
      "src/app.test.ts",
      "src/critical.test.ts"
    ];
    
    for (const file of files) {
      const filePath = join(testDir, file);
      const reason = await checkGitignoreReason(filePath, testDir);
      
      try {
        const { stdout } = await execAsync(`git check-ignore -v ${file}`, { cwd: testDir });
        const gitOutput = stdout.trim();
        
        if (reason) {
          const ourOutput = formatGitignoreReason(reason);
          // Git and our implementation should produce similar output
          expect(ourOutput).toContain(reason.pattern);
          expect(gitOutput).toContain(reason.pattern);
        }
      } catch (error: any) {
        // git check-ignore returns exit code 1 when file is not ignored
        if (error.code === 1) {
          expect(reason).toBeNull();
        } else {
          throw error;
        }
      }
    }
  });
});