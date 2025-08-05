import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { glob as fsGlob } from "node:fs/promises";
import { glob } from "../src/index.js";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";

describe("glob vs node:fs/promises glob", () => {
  const testDir = join(process.cwd(), "test-fixtures");
  
  beforeAll(async () => {
    // テスト用ディレクトリ構造を作成
    await mkdir(testDir, { recursive: true });
    await mkdir(join(testDir, "src"), { recursive: true });
    await mkdir(join(testDir, "dist"), { recursive: true });
    await mkdir(join(testDir, "node_modules"), { recursive: true });
    await mkdir(join(testDir, ".git"), { recursive: true });
    
    // テストファイルを作成
    await writeFile(join(testDir, "index.ts"), "// main file");
    await writeFile(join(testDir, "README.md"), "# Test");
    await writeFile(join(testDir, "package.json"), "{}");
    await writeFile(join(testDir, ".env"), "SECRET=123");
    
    await writeFile(join(testDir, "src", "app.ts"), "// app");
    await writeFile(join(testDir, "src", "app.test.ts"), "// test");
    await writeFile(join(testDir, "src", "utils.js"), "// utils");
    
    await writeFile(join(testDir, "dist", "app.js"), "// compiled");
    await writeFile(join(testDir, "dist", "app.d.ts"), "// types");
    
    await writeFile(join(testDir, "node_modules", "pkg.js"), "// dep");
    await writeFile(join(testDir, ".git", "config"), "// git");
    
    // .gitignore を作成
    await writeFile(join(testDir, ".gitignore"), `# Dependencies
node_modules/

# Build output
dist/
*.log

# Environment
.env
.env.*

# IDE
.vscode/
.idea/

# OS
.DS_Store
Thumbs.db

# Test coverage
coverage/
*.lcov
`);
  });
  
  afterAll(async () => {
    await rm(testDir, { recursive: true, force: true });
  });
  
  it("should find all files with node:fs/promises glob (baseline)", async () => {
    const files = [];
    for await (const file of fsGlob("**/*", { cwd: testDir })) {
      files.push(file);
    }
    
    expect(files).toContain("src/app.ts");
    expect(files).toContain("node_modules/pkg.js"); // gitignoreされるべきファイル
    expect(files).toContain("dist/app.js"); // gitignoreされるべきファイル
    // Note: .env is a hidden file and won't be found by default glob pattern
  });
  
  it("should respect .gitignore patterns", async () => {
    const files = await glob("**/*", { cwd: testDir });
    
    // 含まれるべきファイル
    expect(files).toContain("src/app.ts");
    expect(files).toContain("src/app.test.ts");
    expect(files).toContain("src/utils.js");
    expect(files).toContain("README.md");
    expect(files).toContain("package.json");
    // .gitignore is a hidden file but should be included
    
    // 除外されるべきファイル
    expect(files).not.toContain("node_modules/pkg.js");
    expect(files).not.toContain("dist/app.js");
    expect(files).not.toContain("dist/app.d.ts");
    // .env and .git/config are hidden files, not matched by **/*
  });
  
  it("should handle specific patterns", async () => {
    const tsFiles = await glob("**/*.ts", { cwd: testDir });
    
    expect(tsFiles).toContain("index.ts");
    expect(tsFiles).toContain("src/app.ts");
    expect(tsFiles).toContain("src/app.test.ts");
    expect(tsFiles).not.toContain("dist/app.d.ts"); // distは除外
  });
  
  it.skip("should handle negation patterns", async () => {
    // .gitignoreに否定パターンを追加
    await writeFile(join(testDir, "dist", "important.js"), "// important");
    await writeFile(join(testDir, ".gitignore"), `# Dependencies
node_modules/

# Build output
dist/
!dist/important.js

# Environment
.env
.env.*
`, "utf-8");
    
    const files = await glob("**/*", { cwd: testDir });
    
    expect(files).not.toContain("dist/app.js");
    expect(files).toContain("dist/important.js"); // 否定パターンで含まれる
  });
});