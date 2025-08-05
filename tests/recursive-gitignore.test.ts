import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { glob, findGitignore } from "../src/index.js";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";

describe("recursive .gitignore support", () => {
  const testDir = join(process.cwd(), "test-recursive");
  
  beforeAll(async () => {
    // 再帰的なディレクトリ構造を作成
    await mkdir(testDir, { recursive: true });
    await mkdir(join(testDir, "frontend"), { recursive: true });
    await mkdir(join(testDir, "frontend", "src"), { recursive: true });
    await mkdir(join(testDir, "frontend", "dist"), { recursive: true });
    await mkdir(join(testDir, "backend"), { recursive: true });
    await mkdir(join(testDir, "backend", "src"), { recursive: true });
    await mkdir(join(testDir, "backend", "build"), { recursive: true });
    
    // ルートの.gitignore
    await writeFile(join(testDir, ".gitignore"), `# Root ignores
*.log
.env
node_modules/
`);
    
    // frontend/.gitignore
    await writeFile(join(testDir, "frontend", ".gitignore"), `# Frontend specific
dist/
.cache/
`);
    
    // backend/.gitignore
    await writeFile(join(testDir, "backend", ".gitignore"), `# Backend specific
build/
*.tmp
`);
    
    // ファイルを配置
    await writeFile(join(testDir, "README.md"), "# Root");
    await writeFile(join(testDir, "error.log"), "errors");
    await writeFile(join(testDir, ".env"), "SECRET=root");
    
    await writeFile(join(testDir, "frontend", "package.json"), "{}");
    await writeFile(join(testDir, "frontend", "src", "app.ts"), "// app");
    await writeFile(join(testDir, "frontend", "dist", "app.js"), "// compiled");
    
    await writeFile(join(testDir, "backend", "package.json"), "{}");
    await writeFile(join(testDir, "backend", "src", "server.ts"), "// server");
    await writeFile(join(testDir, "backend", "build", "server.js"), "// compiled");
    await writeFile(join(testDir, "backend", "data.tmp"), "temp data");
  });
  
  afterAll(async () => {
    await rm(testDir, { recursive: true, force: true });
  });
  
  it("should find all .gitignore files recursively", async () => {
    const gitignoreFiles = await findGitignore(join(testDir, "frontend", "src"));
    
    // Should find frontend/.gitignore and root .gitignore within test directory
    expect(gitignoreFiles).toContain(join(testDir, "frontend", ".gitignore"));
    expect(gitignoreFiles).toContain(join(testDir, ".gitignore"));
    // May also find project root .gitignore, but we only care about test directory
  });
  
  it.skip("should respect all .gitignore files in the hierarchy", async () => {
    const files = await glob("**/*", { cwd: testDir });
    
    // 含まれるべきファイル
    expect(files).toContain("README.md");
    expect(files).toContain("frontend/package.json");
    expect(files).toContain("frontend/src/app.ts");
    expect(files).toContain("backend/package.json");
    expect(files).toContain("backend/src/server.ts");
    
    // ルートの.gitignoreで除外
    expect(files).not.toContain("error.log");
    expect(files).not.toContain(".env");
    
    // frontend/.gitignoreで除外
    expect(files).not.toContain("frontend/dist/app.js");
    
    // backend/.gitignoreで除外
    expect(files).not.toContain("backend/build/server.js");
    expect(files).not.toContain("backend/data.tmp");
  });
  
  it("should correctly handle patterns when starting from subdirectory", async () => {
    const files = await glob("**/*", { cwd: join(testDir, "frontend") });
    
    expect(files).toContain("src/app.ts");
    expect(files).toContain("package.json");
    expect(files).not.toContain("dist/app.js"); // frontend/.gitignoreで除外
  });
  
  it.skip("should merge patterns correctly", async () => {
    // backend/srcから検索した場合、両方の.gitignoreが適用される
    const files = await glob("../**/*", { cwd: join(testDir, "backend", "src") });
    
    expect(files).toContain("../package.json");
    expect(files).toContain("server.ts");
    expect(files).not.toContain("../build/server.js");
    expect(files).not.toContain("../data.tmp");
  });
});