import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src_new/**/*.spec.ts"],
    env: {
      JWT_SECRET: "test-secret",
      SALT_ROUND: "10",
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src_new/**/*.ts"],
      exclude: ["src_new/**/*.spec.ts", "src_new/**/*.dto.ts"],
    },
  },
});
