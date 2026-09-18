import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    include: ["src/core/json/performance.perf.ts"],
    testTimeout: 30_000,
  },
})
