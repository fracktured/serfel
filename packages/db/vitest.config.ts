import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // These are integration tests: each file drops/creates its own database and
    // replays the full schema-migration set against one shared local MariaDB.
    // Running the files in parallel puts several concurrent migration replays on
    // that single instance, and the contention pushes an otherwise ~1.3s test
    // past the default 5s timeout. Serialize the files (they use distinct DB
    // names, so this is only about resource contention) and give the DB-heavy
    // work a generous timeout.
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
