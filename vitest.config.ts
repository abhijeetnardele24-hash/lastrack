import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
    reporters: ["default", "json"],
    outputFile: {
      json: "test-results/vitest-results.json",
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "json-summary", "html"],
      include: [
        "packages/domain/src/**/*.ts",
        "packages/contracts/src/**/*.ts",
        "apps/server/src/**/*.ts",
      ],
      exclude: [
        "**/*.d.ts",
        "**/dist/**",
        "**/node_modules/**",
      ],
    },
  },
  resolve: {
    alias: {
      "@lastrack/contracts": path.resolve(__dirname, "./packages/contracts/src/index.ts"),
      "@lastrack/domain": path.resolve(__dirname, "./packages/domain/src/index.ts"),
      "@lastrack/fixtures": path.resolve(__dirname, "./packages/fixtures/src/index.ts"),
    },
  },
});
