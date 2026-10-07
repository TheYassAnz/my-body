import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: "node",
    testTimeout: 15_000,
    hookTimeout: 20_000,
    include: ["src/**/*.test.{ts,tsx}", "tests/integration/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/lib/**"],
      // ENF-42: business rules and unit conversions are fully tested.
      thresholds: {
        "src/lib/metrics/**": { lines: 95, branches: 95, functions: 95, statements: 95 },
        "src/lib/units.ts": { lines: 95, branches: 95, functions: 95, statements: 95 },
      },
    },
  },
});
