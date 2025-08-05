import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { parseGitignoreToExclude } from "../src/index.js";
import { writeFile, rm, mkdir } from "node:fs/promises";
import { join } from "node:path";

describe("gitignore pattern parsing", () => {
  const testDir = join(process.cwd(), "test-gitignore-temp");
  const testFile = join(testDir, ".gitignore");
  
  beforeEach(async () => {
    await mkdir(testDir, { recursive: true });
  });
  
  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });
  
  it("should parse basic patterns", async () => {
    await writeFile(testFile, `node_modules/
dist/
*.log`);
    
    const patterns = await parseGitignoreToExclude(testFile);
    
    expect(patterns).toContain("**/node_modules/**");
    expect(patterns).toContain("**/dist/**");
    expect(patterns).toContain("**/*.log");
  });
  
  it("should handle comments and empty lines", async () => {
    await writeFile(testFile, `# Dependencies
node_modules/

# Build output
dist/
build/

# Logs
*.log`);
    
    const patterns = await parseGitignoreToExclude(testFile);
    
    expect(patterns).toContain("**/node_modules/**");
    expect(patterns).toContain("**/dist/**");
    expect(patterns).toContain("**/build/**");
    expect(patterns).toContain("**/*.log");
    expect(patterns.length).toBe(4);
  });
  
  it("should handle negation patterns", async () => {
    await writeFile(testFile, `*.log
!important.log
dist/
!dist/keep.js`);
    
    const patterns = await parseGitignoreToExclude(testFile);
    
    expect(patterns).toContain("**/*.log");
    expect(patterns).toContain("!**/important.log");
    expect(patterns).toContain("**/dist/**");
    expect(patterns).toContain("!**/dist/keep.js");
  });
  
  it("should handle directory patterns", async () => {
    await writeFile(testFile, `# Directory with trailing slash
logs/

# Directory without trailing slash
build

# Specific path
/root-only.txt

# Wildcard directories
**/temp/`);
    
    const patterns = await parseGitignoreToExclude(testFile);
    
    expect(patterns).toContain("**/logs/**");
    expect(patterns).toContain("**/build");
    expect(patterns).toContain("**/build/**");
    expect(patterns).toContain("root-only.txt");
    expect(patterns).toContain("**/temp/**");
  });
  
  it("should handle complex patterns", async () => {
    await writeFile(testFile, `# Various patterns
*.log
!debug.log
.env*
!.env.example
/build/
src/**/*.test.ts
docs/**/*.md
!docs/README.md
temp/
*.tmp
.DS_Store
**/.git/`);
    
    const patterns = await parseGitignoreToExclude(testFile);
    
    expect(patterns).toContain("**/*.log");
    expect(patterns).toContain("!**/debug.log");
    expect(patterns).toContain("**/.env*");
    expect(patterns).toContain("!**/.env.example");
    expect(patterns).toContain("build/**");
    expect(patterns).toContain("src/**/*.test.ts");
    expect(patterns).toContain("docs/**/*.md");
    expect(patterns.some(p => p.startsWith("!") && p.includes("docs") && p.includes("README.md"))).toBe(true);
    expect(patterns).toContain("**/temp/**");
    expect(patterns).toContain("**/*.tmp");
    expect(patterns).toContain("**/.DS_Store");
    expect(patterns).toContain("**/.git/**");
  });
  
  it("should handle glob patterns", async () => {
    await writeFile(testFile, `# Glob patterns
test-*.js
src/**/test-*.ts
[Tt]humbs.db
package-lock.json
*.{log,tmp}
{build,dist}/`);
    
    const patterns = await parseGitignoreToExclude(testFile);
    
    expect(patterns).toContain("**/test-*.js");
    expect(patterns).toContain("src/**/test-*.ts");
    expect(patterns).toContain("**/[Tt]humbs.db");
    expect(patterns).toContain("**/package-lock.json");
    expect(patterns).toContain("**/*.{log,tmp}");
    expect(patterns).toContain("**/{build,dist}/**");
  });
  
  it("should handle root-relative patterns", async () => {
    await writeFile(testFile, `/node_modules
/dist/
/.env
/src/generated/`);
    
    const patterns = await parseGitignoreToExclude(testFile);
    
    expect(patterns).toContain("node_modules");
    expect(patterns).toContain("node_modules/**");
    expect(patterns).toContain("dist/**");
    expect(patterns).toContain(".env");
    expect(patterns).toContain("src/generated/**");
  });
  
  it("should handle mixed patterns with subdirectories", async () => {
    await writeFile(testFile, `# Root patterns
/config.local.js
/.env.local

# Subdirectory patterns
src/temp/
tests/**/*.tmp

# Extension patterns
*.log
*.cache

# Negations
!important.log
!tests/fixtures/**`);
    
    const patterns = await parseGitignoreToExclude(testFile);
    
    expect(patterns).toContain("config.local.js");
    expect(patterns).toContain(".env.local");
    expect(patterns).toContain("**/src/temp/**");
    expect(patterns).toContain("tests/**/*.tmp");
    expect(patterns).toContain("**/*.log");
    expect(patterns).toContain("**/*.cache");
    expect(patterns).toContain("!**/important.log");
    expect(patterns).toContain("!tests/fixtures/**");
  });
});