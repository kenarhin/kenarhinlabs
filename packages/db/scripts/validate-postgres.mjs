import { readdirSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const expectedTables = {
  app: ["profiles", "roles", "permissions", "user_roles", "role_permissions", "settings"],
  media: ["asset_folders", "assets", "asset_usages"],
  content: [
    "content_items",
    "content_revisions",
    "categories",
    "tags",
    "content_categories",
    "content_tags",
    "redirects",
    "navigation_items",
  ],
  crm: ["clients", "contacts", "leads", "projects", "project_milestones", "project_tasks"],
  commerce: ["vendors", "tools", "offers", "affiliate_links", "pricing_snapshots"],
  comms: ["email_templates", "email_threads", "email_messages"],
  sync: ["outbox_events", "projection_runs"],
  audit: ["audit_logs"],
  analytics: ["events_daily"],
  system: ["feature_flags", "integrations"],
};

const requiredIndexes = [
  "content_items_type_slug_active_unique",
  "content_items_status_published_idx",
  "content_items_type_status_published_idx",
  "content_items_search_idx",
  "contacts_one_primary_per_client",
  "outbox_events_poll_idx",
  "outbox_events_aggregate_version_idx",
  "outbox_events_dedupe_key_unique",
  "events_daily_dimensions_unique",
  "profiles_avatar_asset_idx",
  "role_permissions_permission_idx",
  "settings_updated_by_idx",
  "user_roles_assigned_by_idx",
  "user_roles_role_idx",
  "affiliate_links_offer_idx",
  "affiliate_links_tool_idx",
  "offers_tool_idx",
  "tools_vendor_idx",
  "vendors_logo_asset_idx",
  "email_threads_client_idx",
  "email_threads_lead_idx",
  "content_categories_category_idx",
  "content_items_author_idx",
  "content_items_cover_asset_idx",
  "content_items_created_by_idx",
  "content_items_og_asset_idx",
  "content_items_published_by_idx",
  "content_items_updated_by_idx",
  "content_revisions_created_by_idx",
  "content_tags_tag_idx",
  "navigation_items_parent_idx",
  "clients_created_by_idx",
  "leads_assigned_to_idx",
  "project_tasks_milestone_idx",
  "projects_created_by_idx",
  "asset_folders_parent_idx",
  "assets_uploaded_by_idx",
  "feature_flags_updated_by_idx",
];

const requiredChecks = [
  "status <> 'published' or published_at is not null",
  "status <> 'scheduled' or scheduled_for is not null",
  "email is not null or phone is not null",
  "starts_at is null or ends_at is null or starts_at < ends_at",
  "html_body is not null or text_body is not null",
  "attempts >= 0",
  "count >= 0",
];

/** Fails when a documented canonical table, constraint, or security primitive disappears. */
function validatePostgresMigrations() {
  const packageRoot = fileURLToPath(new URL("..", import.meta.url));
  const repositoryRoot = fileURLToPath(new URL("../../..", import.meta.url));
  const migrationsRoot = `${repositoryRoot}/supabase/migrations`;
  const tableSql = readFileSync(
    `${migrationsRoot}/20260710000100_create_full_backend_schema.sql`,
    "utf8",
  ).toLowerCase();
  const behaviorSql = readFileSync(
    `${repositoryRoot}/supabase/migrations/20260710000200_create_functions_and_triggers.sql`,
    "utf8",
  ).toLowerCase();
  const securitySql = readFileSync(
    `${repositoryRoot}/supabase/migrations/20260710000300_secure_grants_and_rls.sql`,
    "utf8",
  ).toLowerCase();
  const seedSql = readFileSync(
    `${migrationsRoot}/20260710000400_seed_reference_data.sql`,
    "utf8",
  ).toLowerCase();
  // Validate indexes against the complete ordered migration history, including later hardening steps.
  const migrationSql = readdirSync(migrationsRoot)
    .filter((filename) => filename.endsWith(".sql"))
    .sort()
    .map((filename) => readFileSync(`${migrationsRoot}/${filename}`, "utf8"))
    .join("\n")
    .toLowerCase();

  for (const [schema, tables] of Object.entries(expectedTables)) {
    for (const table of tables) {
      if (!tableSql.includes(`create table ${schema}.${table}`)) {
        throw new Error(`Missing canonical table ${schema}.${table}`);
      }
    }
  }

  const expectedTableCount = Object.values(expectedTables).flat().length;
  const createdTables = [...tableSql.matchAll(/create table\s+([a-z_]+\.[a-z_]+)/g)].map(
    (match) => match[1],
  );
  if (createdTables.length !== expectedTableCount) {
    throw new Error(
      `Expected ${expectedTableCount} canonical tables, found ${createdTables.length}`,
    );
  }

  for (const indexName of requiredIndexes) {
    if (!migrationSql.includes(indexName)) throw new Error(`Missing canonical index ${indexName}`);
  }
  for (const checkExpression of requiredChecks) {
    if (!tableSql.includes(checkExpression)) {
      throw new Error(`Missing canonical constraint expression: ${checkExpression}`);
    }
  }

  const requiredBehavior = [
    "function app.handle_new_auth_user",
    "function app.has_permission",
    "function content.capture_content_revision",
    "function sync.enqueue_projection_event",
    "function sync.claim_outbox_events",
    "function sync.complete_outbox_event",
    "function sync.fail_outbox_event",
  ];
  for (const marker of requiredBehavior) {
    if (!behaviorSql.includes(marker)) throw new Error(`Missing behavior: ${marker}`);
  }

  for (const schema of Object.keys(expectedTables)) {
    if (!securitySql.includes(`'${schema}'`))
      throw new Error(`RLS loop does not cover schema ${schema}`);
  }
  if (!securitySql.includes("enable row level security"))
    throw new Error("RLS is not enabled by migration");
  if (!securitySql.includes("revoke execute on all functions"))
    throw new Error("Functions are not deny-by-default");
  if (
    !securitySql.includes(
      "grant insert (name, email, phone, company, source, message, interest, metadata) on crm.leads to anon",
    )
  ) {
    throw new Error("Anonymous lead intake is not column-restricted");
  }
  for (const table of createdTables) {
    const [schema] = table.split(".");
    if (!securitySql.includes(`'${schema}'`)) {
      throw new Error(`Security migration does not cover ${table}`);
    }
  }
  if (!seedSql.includes("'owner'") || !seedSql.includes("'system.manage'"))
    throw new Error("RBAC reference data is incomplete");

  if (!packageRoot.endsWith("/packages/db/")) throw new Error("Unexpected package root");

  // Exporting proves Drizzle can evaluate the complete TypeScript schema without a database.
  const drizzleExport = execFileSync(
    join(packageRoot, "node_modules/.bin/drizzle-kit"),
    ["export", "--config=drizzle.config.ts"],
    { cwd: packageRoot, encoding: "utf8" },
  ).toLowerCase();
  for (const [schema, tables] of Object.entries(expectedTables)) {
    for (const table of tables) {
      if (!drizzleExport.includes(`create table "${schema}"."${table}"`)) {
        throw new Error(`Drizzle export is missing ${schema}.${table}`);
      }
    }
  }
}

validatePostgresMigrations();
