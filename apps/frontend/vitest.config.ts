import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.spec.ts"],
    environment: "node",
  },
  resolve: {
    alias: {
      "@serfel/shared": fileURLToPath(
        new URL("../../packages/shared/src/index.ts", import.meta.url)
      ),
    },
  },
});
