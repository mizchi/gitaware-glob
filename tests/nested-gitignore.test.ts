import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { glob } from "./test-utils.js";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";

describe("nested .gitignore support", () => {
  const testDir = join(process.cwd(), "test-nested-gitignore");
  
  beforeAll(async () => {
    // Create complex nested structure
    await mkdir(testDir, { recursive: true });
    
    // Root level
    await mkdir(join(testDir, "src"), { recursive: true });
    await mkdir(join(testDir, "lib"), { recursive: true });
    await mkdir(join(testDir, "node_modules"), { recursive: true });
    await mkdir(join(testDir, "dist"), { recursive: true });
    
    // Nested directories
    await mkdir(join(testDir, "src", "components"), { recursive: true });
    await mkdir(join(testDir, "src", "components", "ui"), { recursive: true });
    await mkdir(join(testDir, "src", "utils"), { recursive: true });
    await mkdir(join(testDir, "src", "utils", "helpers"), { recursive: true });
    await mkdir(join(testDir, "lib", "external"), { recursive: true });
    await mkdir(join(testDir, "lib", "internal"), { recursive: true });
    
    // Root .gitignore
    await writeFile(join(testDir, ".gitignore"), `# Root level ignores
node_modules/
dist/
*.log
.DS_Store
`);
    
    // src/.gitignore - ignores test files
    await writeFile(join(testDir, "src", ".gitignore"), `# Ignore test files in src
*.test.ts
*.spec.ts
__tests__/
!important.test.ts
`);
    
    // src/components/.gitignore - ignores draft components
    await writeFile(join(testDir, "src", "components", ".gitignore"), `# Ignore draft components
*.draft.tsx
Draft*.tsx
temp/
`);
    
    // lib/.gitignore - different rules for lib
    await writeFile(join(testDir, "lib", ".gitignore"), `# Lib specific ignores
*.min.js
*.map
internal/
!internal/public.js
`);
    
    // Create files at different levels
    // Root level
    await writeFile(join(testDir, "index.ts"), "// root index");
    await writeFile(join(testDir, "setup.ts"), "// setup");
    await writeFile(join(testDir, "error.log"), "// should be ignored");
    await writeFile(join(testDir, ".DS_Store"), "// should be ignored");
    
    // node_modules (should be ignored)
    await writeFile(join(testDir, "node_modules", "package.js"), "// ignored");
    
    // dist (should be ignored)
    await writeFile(join(testDir, "dist", "bundle.js"), "// ignored");
    
    // src files
    await writeFile(join(testDir, "src", "main.ts"), "// main");
    await writeFile(join(testDir, "src", "app.ts"), "// app");
    await writeFile(join(testDir, "src", "app.test.ts"), "// should be ignored by src/.gitignore");
    await writeFile(join(testDir, "src", "utils.spec.ts"), "// should be ignored by src/.gitignore");
    await writeFile(join(testDir, "src", "important.test.ts"), "// should NOT be ignored (negation)");
    
    // src/components files
    await writeFile(join(testDir, "src", "components", "Button.tsx"), "// button");
    await writeFile(join(testDir, "src", "components", "Button.draft.tsx"), "// should be ignored");
    await writeFile(join(testDir, "src", "components", "DraftModal.tsx"), "// should be ignored");
    await writeFile(join(testDir, "src", "components", "Modal.tsx"), "// modal");
    
    // src/components/ui files
    await writeFile(join(testDir, "src", "components", "ui", "Input.tsx"), "// input");
    await writeFile(join(testDir, "src", "components", "ui", "Input.draft.tsx"), "// should be ignored");
    
    // src/utils files
    await writeFile(join(testDir, "src", "utils", "format.ts"), "// format");
    await writeFile(join(testDir, "src", "utils", "format.test.ts"), "// should be ignored");
    await writeFile(join(testDir, "src", "utils", "helpers", "date.ts"), "// date helper");
    await writeFile(join(testDir, "src", "utils", "helpers", "date.test.ts"), "// should be ignored");
    
    // lib files
    await writeFile(join(testDir, "lib", "core.js"), "// core");
    await writeFile(join(testDir, "lib", "core.min.js"), "// should be ignored");
    await writeFile(join(testDir, "lib", "core.js.map"), "// should be ignored");
    await writeFile(join(testDir, "lib", "external", "vendor.js"), "// vendor");
    await writeFile(join(testDir, "lib", "internal", "private.js"), "// should be ignored");
    await writeFile(join(testDir, "lib", "internal", "public.js"), "// should NOT be ignored (negation)");
  });
  
  afterAll(async () => {
    await rm(testDir, { recursive: true, force: true });
  });
  
  it("should respect all nested .gitignore files", async () => {
    const files = await glob("**/*", { cwd: testDir });
    
    // Root level - should include
    expect(files).toContain("index.ts");
    expect(files).toContain("setup.ts");
    
    // Root level - should NOT include (root .gitignore)
    expect(files).not.toContain("error.log");
    expect(files).not.toContain(".DS_Store");
    expect(files).not.toContain("node_modules/package.js");
    expect(files).not.toContain("dist/bundle.js");
    
    // src level - should include
    expect(files).toContain("src/main.ts");
    expect(files).toContain("src/app.ts");
    expect(files).toContain("src/important.test.ts"); // negation pattern
    
    // src level - should NOT include (src/.gitignore)
    expect(files).not.toContain("src/app.test.ts");
    expect(files).not.toContain("src/utils.spec.ts");
    
    // src/components - should include
    expect(files).toContain("src/components/Button.tsx");
    expect(files).toContain("src/components/Modal.tsx");
    
    // src/components - should NOT include (src/components/.gitignore)
    expect(files).not.toContain("src/components/Button.draft.tsx");
    expect(files).not.toContain("src/components/DraftModal.tsx");
    
    // Nested directories should also respect parent .gitignore files
    expect(files).toContain("src/components/ui/Input.tsx");
    expect(files).not.toContain("src/components/ui/Input.draft.tsx");
    
    // src/utils should respect src/.gitignore
    expect(files).toContain("src/utils/format.ts");
    expect(files).not.toContain("src/utils/format.test.ts");
    expect(files).toContain("src/utils/helpers/date.ts");
    expect(files).not.toContain("src/utils/helpers/date.test.ts");
    
    // lib directory
    expect(files).toContain("lib/core.js");
    expect(files).toContain("lib/external/vendor.js");
    expect(files).toContain("lib/internal/public.js"); // negation pattern
    
    // lib - should NOT include (lib/.gitignore)
    expect(files).not.toContain("lib/core.min.js");
    expect(files).not.toContain("lib/core.js.map");
    expect(files).not.toContain("lib/internal/private.js");
  });
  
  it("should correctly handle patterns when searching from subdirectory", async () => {
    // Search from src directory
    const srcFiles = await glob("**/*.ts", { cwd: join(testDir, "src") });
    
    expect(srcFiles).toContain("main.ts");
    expect(srcFiles).toContain("app.ts");
    expect(srcFiles).toContain("important.test.ts");
    expect(srcFiles).toContain("utils/format.ts");
    expect(srcFiles).toContain("utils/helpers/date.ts");
    
    expect(srcFiles).not.toContain("app.test.ts");
    expect(srcFiles).not.toContain("utils/format.test.ts");
    expect(srcFiles).not.toContain("utils/helpers/date.test.ts");
  });
  
  it("should handle different file patterns with nested gitignores", async () => {
    // Search for .tsx files
    const tsxFiles = await glob("**/*.tsx", { cwd: testDir });
    
    expect(tsxFiles).toContain("src/components/Button.tsx");
    expect(tsxFiles).toContain("src/components/Modal.tsx");
    expect(tsxFiles).toContain("src/components/ui/Input.tsx");
    
    expect(tsxFiles).not.toContain("src/components/Button.draft.tsx");
    expect(tsxFiles).not.toContain("src/components/DraftModal.tsx");
    expect(tsxFiles).not.toContain("src/components/ui/Input.draft.tsx");
    
    // Search for .js files
    const jsFiles = await glob("**/*.js", { cwd: testDir });
    
    expect(jsFiles).toContain("lib/core.js");
    expect(jsFiles).toContain("lib/external/vendor.js");
    expect(jsFiles).toContain("lib/internal/public.js");
    
    expect(jsFiles).not.toContain("lib/core.min.js");
    expect(jsFiles).not.toContain("lib/internal/private.js");
    expect(jsFiles).not.toContain("node_modules/package.js");
  });
  
  it("should correctly merge patterns from multiple gitignore files", async () => {
    // Create a deep test file that should be affected by multiple .gitignore files
    const deepDir = join(testDir, "src", "components", "ui", "temp");
    await mkdir(deepDir, { recursive: true });
    await writeFile(join(deepDir, "test.tsx"), "// test");
    await writeFile(join(deepDir, "draft.tsx"), "// draft");
    await writeFile(join(deepDir, "file.test.ts"), "// test file");
    
    const files = await glob("src/components/ui/temp/*", { cwd: testDir });
    
    // Should be affected by src/components/.gitignore (temp/ pattern)
    expect(files).toHaveLength(0);
    
    // Clean up
    await rm(deepDir, { recursive: true, force: true });
  });
});