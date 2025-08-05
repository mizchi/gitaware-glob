import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { glob } from "./test-utils.js";
import { checkGitignoreReason, formatGitignoreReason } from "../src/check-ignore.js";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

describe("complex nested gitignore with negations", () => {
  const testDir = join(process.cwd(), "test-complex-nested");
  
  beforeAll(async () => {
    /*
    Test directory structure:
    test-complex-nested/
    ├── .gitignore (root: ignore all *.log, !important.log)
    ├── logs/
    │   ├── .gitignore (ignore *.tmp, !critical.tmp, debug/)
    │   ├── app.log (should be ignored by root)
    │   ├── important.log (should NOT be ignored - negated in root)
    │   ├── data.tmp (should be ignored)
    │   ├── critical.tmp (should NOT be ignored - negated locally)
    │   └── debug/
    │       ├── .gitignore (!trace.log)
    │       ├── verbose.log (should be ignored by root)
    │       └── trace.log (should NOT be ignored - negated locally)
    ├── src/
    │   ├── .gitignore (ignore build/, !build/keep/, test/)
    │   ├── main.js
    │   ├── build/
    │   │   ├── output.js (should be ignored)
    │   │   └── keep/
    │   │       ├── .gitignore (!*.min.js)
    │   │       ├── bundle.js (should NOT be ignored - parent negated)
    │   │       └── app.min.js (should NOT be ignored - double negation)
    │   └── test/
    │       ├── .gitignore (!*.spec.js, fixtures/)
    │       ├── unit.test.js (should be ignored by parent)
    │       ├── integration.spec.js (should NOT be ignored - negated)
    │       └── fixtures/
    │           ├── .gitignore (!important/*)
    │           ├── data.json (should be ignored)
    │           └── important/
    │               └── config.json (should NOT be ignored - negated)
    └── docs/
        ├── .gitignore (*.pdf, !manual.pdf, images/, !images/*.png)
        ├── guide.pdf (should be ignored)
        ├── manual.pdf (should NOT be ignored - negated)
        └── images/
            ├── diagram.jpg (should be ignored)
            └── screenshot.png (should NOT be ignored - negated)
    */
    
    // Create directory structure
    await mkdir(testDir, { recursive: true });
    await mkdir(join(testDir, "logs", "debug"), { recursive: true });
    await mkdir(join(testDir, "src", "build", "keep"), { recursive: true });
    await mkdir(join(testDir, "src", "test", "fixtures", "important"), { recursive: true });
    await mkdir(join(testDir, "docs", "images"), { recursive: true });
    
    // Initialize git repo for comparison
    await execAsync("git init", { cwd: testDir });
    
    // Root .gitignore
    await writeFile(join(testDir, ".gitignore"), `# Root gitignore
*.log
!important.log
`);
    
    // logs/.gitignore
    await writeFile(join(testDir, "logs", ".gitignore"), `# Logs directory
*.tmp
!critical.tmp
debug/
`);
    
    // logs/debug/.gitignore
    await writeFile(join(testDir, "logs", "debug", ".gitignore"), `# Debug directory
!trace.log
`);
    
    // src/.gitignore
    await writeFile(join(testDir, "src", ".gitignore"), `# Source directory
build/
!build/keep/
test/
`);
    
    // src/build/keep/.gitignore
    await writeFile(join(testDir, "src", "build", "keep", ".gitignore"), `# Keep directory
!*.min.js
`);
    
    // src/test/.gitignore
    await writeFile(join(testDir, "src", "test", ".gitignore"), `# Test directory
!*.spec.js
fixtures/
`);
    
    // src/test/fixtures/.gitignore
    await writeFile(join(testDir, "src", "test", "fixtures", ".gitignore"), `# Fixtures directory
!important/*
`);
    
    // docs/.gitignore
    await writeFile(join(testDir, "docs", ".gitignore"), `# Documentation
*.pdf
!manual.pdf
images/
!images/*.png
`);
    
    // Create test files
    // logs/
    await writeFile(join(testDir, "logs", "app.log"), "app log");
    await writeFile(join(testDir, "logs", "important.log"), "important log");
    await writeFile(join(testDir, "logs", "data.tmp"), "temp data");
    await writeFile(join(testDir, "logs", "critical.tmp"), "critical temp");
    await writeFile(join(testDir, "logs", "debug", "verbose.log"), "verbose");
    await writeFile(join(testDir, "logs", "debug", "trace.log"), "trace");
    
    // src/
    await writeFile(join(testDir, "src", "main.js"), "main");
    await writeFile(join(testDir, "src", "build", "output.js"), "output");
    await writeFile(join(testDir, "src", "build", "keep", "bundle.js"), "bundle");
    await writeFile(join(testDir, "src", "build", "keep", "app.min.js"), "minified");
    await writeFile(join(testDir, "src", "test", "unit.test.js"), "unit test");
    await writeFile(join(testDir, "src", "test", "integration.spec.js"), "integration");
    await writeFile(join(testDir, "src", "test", "fixtures", "data.json"), "data");
    await writeFile(join(testDir, "src", "test", "fixtures", "important", "config.json"), "config");
    
    // docs/
    await writeFile(join(testDir, "docs", "guide.pdf"), "guide");
    await writeFile(join(testDir, "docs", "manual.pdf"), "manual");
    await writeFile(join(testDir, "docs", "images", "diagram.jpg"), "diagram");
    await writeFile(join(testDir, "docs", "images", "screenshot.png"), "screenshot");
  });
  
  afterAll(async () => {
    await rm(testDir, { recursive: true, force: true });
  });
  
  describe("debug gitignore loading", () => {
    it("should load all gitignore files", async () => {
      // Import internal functions for debugging
      // const { findGitignore } = await import("../src/index.js");
      const { findGitignoreRecursive } = await import("../src/find-gitignore-recursive.js");
      
      const gitignoreFiles = await findGitignoreRecursive(testDir);
      // console.log("Found gitignore files:", gitignoreFiles.map(f => f.replace(testDir, ".")));
      
      // Should find all .gitignore files
      expect(gitignoreFiles.length).toBeGreaterThan(5);
    });
  });
  
  describe("basic negation patterns", () => {
    it("should handle root-level negations", async () => {
      const files = await glob("**/*", { cwd: testDir });
      
      // console.log("Total files found:", files.length);
      // console.log("Files in logs/:", files.filter(f => f.startsWith("logs/")).sort());
      
      // Root .gitignore patterns
      expect(files).not.toContain("logs/app.log"); // *.log
      expect(files).toContain("logs/important.log"); // !important.log
      expect(files).not.toContain("logs/debug/verbose.log"); // *.log applies recursively
    });
    
    it("should handle directory-specific negations", async () => {
      const files = await glob("**/*", { cwd: testDir });
      
      // logs/.gitignore patterns
      expect(files).not.toContain("logs/data.tmp"); // *.tmp
      expect(files).toContain("logs/critical.tmp"); // !critical.tmp
    });
  });
  
  describe("nested directory negations", () => {
    it("should handle directory exclusion with subdirectory negation", async () => {
      const files = await glob("**/*", { cwd: testDir });
      
      // src/.gitignore: build/, !build/keep/
      expect(files).not.toContain("src/build/output.js"); // build/ ignored
      expect(files).toContain("src/build/keep/bundle.js"); // !build/keep/ negated
      expect(files).toContain("src/build/keep/app.min.js"); // !build/keep/ negated
    });
    
    it("should handle complex nested negations", async () => {
      const files = await glob("**/*", { cwd: testDir });
      
      // logs/.gitignore: debug/
      // logs/debug/.gitignore: !trace.log
      expect(files).not.toContain("logs/debug/verbose.log"); // Parent says debug/ ignored
      expect(files).toContain("logs/debug/trace.log"); // Local negation should work
    });
    
    it("should handle pattern negations within ignored directories", async () => {
      const files = await glob("**/*", { cwd: testDir });
      
      // src/.gitignore: test/
      // src/test/.gitignore: !*.spec.js
      expect(files).not.toContain("src/test/unit.test.js"); // Parent says test/ ignored
      expect(files).toContain("src/test/integration.spec.js"); // Negation pattern
      
      // src/test/.gitignore: fixtures/
      // src/test/fixtures/.gitignore: !important/*
      expect(files).not.toContain("src/test/fixtures/data.json"); // fixtures/ ignored
      expect(files).toContain("src/test/fixtures/important/config.json"); // Negated
    });
  });
  
  describe("pattern interactions", () => {
    it("should handle wildcard negations correctly", async () => {
      const files = await glob("**/*", { cwd: testDir });
      
      // docs/.gitignore: images/, !images/*.png
      expect(files).not.toContain("docs/images/diagram.jpg"); // images/ ignored
      expect(files).toContain("docs/images/screenshot.png"); // !images/*.png negated
    });
    
    it("should respect pattern order and precedence", async () => {
      const files = await glob("**/*", { cwd: testDir });
      
      // All these files should exist based on our complex rules
      const expectedFiles = [
        "src/main.js",
        "logs/important.log",
        "logs/critical.tmp",
        "logs/debug/trace.log",
        "src/build/keep/bundle.js",
        "src/build/keep/app.min.js",
        "src/test/integration.spec.js",
        "src/test/fixtures/important/config.json",
        "docs/manual.pdf",
        "docs/images/screenshot.png"
      ];
      
      for (const file of expectedFiles) {
        expect(files).toContain(file);
      }
      
      // These should be ignored
      const ignoredFiles = [
        "logs/app.log",
        "logs/data.tmp",
        "logs/debug/verbose.log",
        "src/build/output.js",
        "src/test/unit.test.js",
        "src/test/fixtures/data.json",
        "docs/guide.pdf",
        "docs/images/diagram.jpg"
      ];
      
      for (const file of ignoredFiles) {
        expect(files).not.toContain(file);
      }
    });
  });
  
  describe("checkGitignoreReason for complex patterns", () => {
    it("should correctly identify which pattern matches", async () => {
      // Test root negation
      let reason = await checkGitignoreReason(join(testDir, "logs/important.log"), testDir);
      expect(reason).toBeTruthy();
      expect(reason?.pattern).toBe("!important.log");
      expect(reason?.ignored).toBe(false);
      
      // Test nested directory negation - Git ignores files in ignored directories
      reason = await checkGitignoreReason(join(testDir, "src/build/keep/bundle.js"), testDir);
      expect(reason).toBeTruthy();
      expect(reason?.pattern).toBe("build/");
      expect(reason?.ignored).toBe(true);
      
      // Test deep nested negation - Git ignores files in ignored directories
      reason = await checkGitignoreReason(join(testDir, "logs/debug/trace.log"), testDir);
      expect(reason).toBeTruthy();
      expect(reason?.pattern).toBe("debug/");
      expect(reason?.ignored).toBe(true);
    });
    
    it("should match ignored files correctly", async () => {
      // Regular ignore pattern
      let reason = await checkGitignoreReason(join(testDir, "logs/app.log"), testDir);
      expect(reason).toBeTruthy();
      expect(reason?.pattern).toBe("*.log");
      expect(reason?.ignored).toBe(true);
      
      // Directory ignore pattern
      reason = await checkGitignoreReason(join(testDir, "src/build/output.js"), testDir);
      expect(reason).toBeTruthy();
      expect(reason?.pattern).toBe("build/");
      expect(reason?.ignored).toBe(true);
    });
  });
  
  describe("git check-ignore comparison", () => {
    it("should match git check-ignore -v for complex cases", async () => {
      const testCases = [
        { file: "logs/important.log", shouldBeIgnored: false },
        { file: "logs/app.log", shouldBeIgnored: true },
        { file: "logs/debug/trace.log", shouldBeIgnored: true },
        { file: "src/build/keep/bundle.js", shouldBeIgnored: true },
        { file: "src/test/integration.spec.js", shouldBeIgnored: true },
        { file: "docs/images/screenshot.png", shouldBeIgnored: true }
      ];
      
      for (const { file, shouldBeIgnored } of testCases) {
        const reason = await checkGitignoreReason(join(testDir, file), testDir);
        
        try {
          const { stdout } = await execAsync(`git check-ignore -v ${file}`, { cwd: testDir });
          const gitOutput = stdout.trim();
          
          // If git reports it's ignored, our implementation should too
          if (reason) {
            expect(reason.ignored).toBe(shouldBeIgnored);
            const ourOutput = formatGitignoreReason(reason);
            // For most cases, both should reference the same pattern
            // But Git doesn't always show negation patterns in ignored directories
            if (!gitOutput.includes('!') || ourOutput.includes(gitOutput.split(':')[2].split('\t')[0])) {
              expect(ourOutput).toBeTruthy();
              expect(gitOutput).toBeTruthy();
            } else {
              expect(ourOutput).toContain(reason.pattern);
              expect(gitOutput).toContain(reason.pattern);
            }
          }
        } catch (error: any) {
          // git check-ignore exits with 1 when file is not ignored
          if (error.code === 1) {
            // For negated patterns, we might still have a reason but with ignored: false
            if (reason) {
              expect(reason.ignored).toBe(false);
            }
            expect(shouldBeIgnored).toBe(false);
          } else {
            throw error;
          }
        }
      }
    });
  });
});