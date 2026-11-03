/**
 * Runs during the Vercel build, before `next build`:
 *   1. If the database was created with `prisma db push` (tables exist but no
 *      migration history), mark the baseline migration 0_init as applied.
 *   2. Apply pending migrations (additive only: nothing is dropped).
 *   3. Run the metadata backfill (safe to repeat).
 * If any step fails or takes too long the build fails, so the previous
 * deployment stays live. Outside Vercel it does nothing unless
 * RUN_DEPLOY_MIGRATIONS=1.
 */
import "dotenv/config";
import { execFileSync } from "node:child_process";
import pg from "pg";

const STEP_TIMEOUT_MS = 5 * 60_000;

/**
 * Prisma Migrate needs a session connection. Transaction-mode poolers (such
 * as Supabase's on port 6543) make it hang, so use DIRECT_URL when given, or
 * the same Supabase pooler in session mode (port 5432).
 */
export function migrationUrl(databaseUrl: string, directUrl?: string): string {
  if (directUrl) return directUrl;
  const url = new URL(databaseUrl);
  if (url.hostname.endsWith(".pooler.supabase.com") && url.port === "6543") {
    url.port = "5432";
    url.searchParams.delete("pgbouncer");
    url.searchParams.delete("connection_limit");
  }
  return url.toString();
}

function run(args: string[], databaseUrl: string): void {
  console.log(`> ${args.join(" ")}`);
  execFileSync("npx", args, {
    stdio: "inherit",
    shell: process.platform === "win32",
    timeout: STEP_TIMEOUT_MS,
    env: { ...process.env, DATABASE_URL: databaseUrl },
  });
}

async function main(): Promise<void> {
  if (!process.env.VERCEL && process.env.RUN_DEPLOY_MIGRATIONS !== "1") {
    console.log("deploy-migrate: not on Vercel, skipping.");
    return;
  }
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set for this environment.");
  const url = migrationUrl(process.env.DATABASE_URL, process.env.DIRECT_URL);
  console.log(`deploy-migrate: using ${new URL(url).hostname}:${new URL(url).port || "5432"}`);

  const client = new pg.Client({ connectionString: url, connectionTimeoutMillis: 30_000, query_timeout: 30_000 });
  await client.connect();
  const { rows } = await client.query<{ history: string | null; users: string | null }>(
    `select to_regclass('public."_prisma_migrations"')::text as history, to_regclass('public."User"')::text as users`,
  );
  let hasBaseline = false;
  if (rows[0].history) {
    const done = await client.query(`select 1 from "_prisma_migrations" where migration_name = '0_init' and finished_at is not null`);
    hasBaseline = (done.rowCount ?? 0) > 0;
  }
  await client.end();

  if (rows[0].users && !hasBaseline) {
    console.log("deploy-migrate: existing schema without a recorded baseline; marking 0_init as applied.");
    run(["prisma", "migrate", "resolve", "--applied", "0_init"], url);
  }
  run(["prisma", "migrate", "deploy"], url);
  run(["tsx", "prisma/scripts/backfill-metadata.ts"], url);
}

if (process.argv[1]?.endsWith("deploy-migrate.ts")) {
  main().catch((error: unknown) => {
    console.error("deploy-migrate failed:", error);
    process.exit(1);
  });
}
