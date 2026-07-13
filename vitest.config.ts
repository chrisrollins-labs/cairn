import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

/**
 * The whole suite is offline by design: no test touches a real network or
 * database. The AI transport and the store are injected, so every path is
 * exercised against deterministic doubles. `npm test` is safe to run anywhere,
 * including CI, with no secrets configured. (ADR-009)
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
