import { readFileSync } from "node:fs";
import { join } from "node:path";
import { sql } from "drizzle-orm";
import type { Db } from "./client";

/**
 * Data-seed migrations that require pre-existing base rows (users, marcas) and
 * therefore cannot apply to an empty test database. Tests apply the schema
 * migrations and seed their own fixtures instead. Keep this list in sync when
 * a new *data-seed* migration lands; schema migrations need no entry.
 */
export const SKIP_DATA_MIGRATIONS = new Set<string>([
  "0004_seed_clientes",
  "0005_seed_productos",
  "0006_seed_stock",
  "0007_fix_clientes_error_id",
]);

interface Journal {
  entries: { idx: number; tag: string }[];
}

/**
 * Applies every migration in the journal EXCEPT the data-seed migrations in
 * SKIP_DATA_MIGRATIONS. Mirrors drizzle's runner: split each file on the
 * `--> statement-breakpoint` marker and execute each statement in order. For
 * test databases only — does not write the __drizzle_migrations bookkeeping table.
 */
export async function migrateSchemaOnly(db: Db, migrationsFolder: string): Promise<void> {
  const journal = JSON.parse(
    readFileSync(join(migrationsFolder, "meta", "_journal.json"), "utf8")
  ) as Journal;
  for (const entry of journal.entries) {
    if (SKIP_DATA_MIGRATIONS.has(entry.tag)) continue;
    const file = readFileSync(join(migrationsFolder, `${entry.tag}.sql`), "utf8");
    const statements = file
      .split("--> statement-breakpoint")
      .map((s) => s.trim())
      .filter((s) => {
        // A statement is a no-op only if every line is blank or a `--` comment
        // (e.g. drizzle-kit's "Custom SQL migration file" header). Some custom
        // migrations put that header and real SQL in the same breakpoint chunk
        // (no separator between them), so a plain startsWith check on the whole
        // chunk would wrongly drop the SQL that follows the header.
        const codeOnly = s
          .split("\n")
          .filter((line) => !line.trim().startsWith("--"))
          .join("\n")
          .trim();
        return codeOnly.length > 0;
      });
    for (const stmt of statements) {
      await db.execute(sql.raw(stmt));
    }
  }
}
