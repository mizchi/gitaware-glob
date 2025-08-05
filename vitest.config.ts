import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    exclude: ["tests/fixtures/**", "node_modules/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "clover"],
      exclude: [
        "node_modules/**",
        "dist/**",
        "examples/**",
        "tests/**/*.test.ts",
        "**/*.d.ts",
        "**/*.config.*",
        ".claude/**",
      ],
      include: ["src/**/*.ts"],
      all: true,
      clean: true,
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
});
