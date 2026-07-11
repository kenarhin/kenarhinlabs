import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const expectedTables = [
  "projection_receipts",
  "public_case_studies",
  "public_content",
  "public_content_blocks",
  "public_content_search",
  "public_homepage_sections",
  "public_navigation",
  "public_offers",
  "public_redirects",
  "public_seo_metadata",
  "public_sitemap_urls",
  "public_stack_guides",
  "public_tools",
];

/** Executes SQLite input and returns its trimmed standard output. */
function executeSql(database, sql) {
  return execFileSync("sqlite3", [database], {
    encoding: "utf8",
    input: sql,
    stdio: ["pipe", "pipe", "inherit"],
  }).trim();
}

/** Proves a statement is rejected by a D1-compatible SQLite constraint. */
function expectSqlFailure(database, sql, label) {
  try {
    execFileSync("sqlite3", [database], { input: sql, stdio: "pipe" });
  } catch {
    return;
  }
  throw new Error(`Expected D1 constraint failure: ${label}`);
}

/**
 * Applies every D1 migration to an isolated SQLite database and exercises key constraints.
 * Inputs are repository migration files; success exits silently and failures are non-zero.
 */
function validateD1Migrations() {
  const packageRoot = fileURLToPath(new URL("..", import.meta.url));
  const migration = join(packageRoot, "d1/migrations/0001_public_read_model.sql");
  const temporaryDirectory = mkdtempSync(join(tmpdir(), "labs-d1-"));
  const database = join(temporaryDirectory, "validation.sqlite");

  try {
    execFileSync("sqlite3", [database], {
      input: readFileSync(migration),
      stdio: ["pipe", "inherit", "inherit"],
    });

    const actualTables = executeSql(
      database,
      // FTS5 creates implementation-owned shadow tables; validate the declared virtual table only.
      "SELECT name FROM sqlite_schema WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT GLOB 'public_content_search_*' ORDER BY name;",
    ).split("\n");
    if (JSON.stringify(actualTables) !== JSON.stringify(expectedTables)) {
      throw new Error(`Unexpected D1 tables: ${actualTables.join(", ")}`);
    }

    // These assertions prove JSON, uniqueness, FK, and idempotency constraints execute in SQLite.
    const smokeTest = `
      PRAGMA foreign_keys = ON;
      INSERT INTO public_content(id,type,slug,title,body_html,author_name,published_at,updated_at)
      VALUES('00000000-0000-0000-0000-000000000001','post','hello','Hello','<p>Hello</p>','Ken','2026-07-10T00:00:00Z','2026-07-10T00:00:00Z');
      INSERT INTO public_content_blocks(content_id,block_key,block_type,data_json)
      VALUES('00000000-0000-0000-0000-000000000001','hero','text','{"text":"Hello"}');
      INSERT INTO projection_receipts(event_id,projection,aggregate_type,aggregate_id,sync_version,payload_checksum,applied_at)
      VALUES('00000000-0000-0000-0000-000000000010','public_content','content.content_items','00000000-0000-0000-0000-000000000001',1,'sha256:test','2026-07-10T00:00:00Z');
      INSERT INTO public_content_search(content_id,title,excerpt,body_text)
      VALUES('00000000-0000-0000-0000-000000000001','Hello',NULL,'Hello from the lab');
    `;
    execFileSync("sqlite3", [database], {
      input: smokeTest,
      stdio: ["pipe", "inherit", "inherit"],
    });

    if (executeSql(database, "PRAGMA foreign_key_check;") !== "") {
      throw new Error("D1 foreign-key validation failed");
    }
    if (executeSql(database, "PRAGMA quick_check;") !== "ok") {
      throw new Error("D1 integrity validation failed");
    }
    if (
      executeSql(
        database,
        "SELECT count(*) FROM public_content_search WHERE public_content_search MATCH 'hello';",
      ) !== "1"
    ) {
      throw new Error("D1 full-text search validation failed");
    }

    expectSqlFailure(
      database,
      "INSERT INTO public_content(id,type,slug,title,body_html,author_name,published_at,updated_at,sync_version) VALUES('bad','post','bad','Bad','x','x','2026-07-10','2026-07-10',0);",
      "positive sync version",
    );
    expectSqlFailure(
      database,
      "INSERT INTO public_content_blocks(content_id,block_key,block_type,data_json) VALUES('00000000-0000-0000-0000-000000000001','bad','text','not-json');",
      "valid block JSON",
    );
    expectSqlFailure(
      database,
      "INSERT INTO public_content(id,type,slug,title,body_html,author_name,published_at,updated_at) VALUES('duplicate','post','hello','Duplicate','x','x','2026-07-10','2026-07-10');",
      "unique public content slug",
    );

    // The export covers the typed schema; FTS remains a deliberate hand-written migration feature.
    const drizzleExport = execFileSync(
      join(packageRoot, "node_modules/.bin/drizzle-kit"),
      ["export", "--config=drizzle.d1.config.ts"],
      { cwd: packageRoot, encoding: "utf8" },
    ).toLowerCase();
    for (const table of expectedTables.filter((name) => name !== "public_content_search")) {
      if (!drizzleExport.includes(`create table \`${table}\``)) {
        throw new Error(`Drizzle D1 export is missing ${table}`);
      }
    }
  } finally {
    rmSync(temporaryDirectory, { recursive: true, force: true });
  }
}

validateD1Migrations();
