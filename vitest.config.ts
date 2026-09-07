import path from "node:path";

import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    // e2e/ holds the Playwright acceptance suite (docs/08 §8.2) — a different test runner with
    // its own `test`/`expect`, not something Vitest should try to collect.
    exclude: [...configDefaults.exclude, "e2e/**"],
  },
});
