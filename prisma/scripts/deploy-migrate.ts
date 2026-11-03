/**
 * Runs during the Vercel build, before `next build`:
 *   1. If the database was created with `prisma db push` (tables exist but no
 *      migration history), mark the baseline migration 0_init as applied.
 *   2. Apply pending migrations (additive only: nothing is dropped).
 *   3. Run the metadata backfill (safe to repeat).
 * If any step fails the build fails, so the previous deployment stays live.
 * Outside Vercel it does nothing unless RUN_DEPLOY_MIGRATIONS=1.
 */
import "dotenv/config";
import { execFileSync } from "node:child_process";
import pg from "pg";

function run(args: string[]): void {
  console.log(`> ${args.join(" ")}`);
  execFileSync("npx", args, { stdio: "inherit", shell: process.platform === "win32" });
}

async function main(): Promise<void> {
  if (!process.env.VERCEL && process.env.RUN_DEPLOY_MIGRATIONS !== "1") {
    console.log("deploy-migrate: not on Vercel, skipping.");
    return;
  }
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set for this environment.");

  const client = new pg.Client({ connectionString: url });
  await client.connect();
  const { rows } = await client.query<{ history: string | null; users: string | null }>(
    `select to_regclass('public."_prisma_migrations"')::text as history, to_regclass('public."User"')::text as users`,
  );
  await client.end();

  if (!rows[0].history && rows[0].users) {
    console.log("deploy-migrate: existing schema without migration history; marking 0_init as applied.");
    run(["prisma", "migrate", "resolve", "--applied", "0_init"]);
  }
  run(["prisma", "migrate", "deploy"]);
  run(["tsx", "prisma/scripts/backfill-metadata.ts"]);
}

main().catch((error: unknown) => {
  console.error("deploy-migrate failed:", error);
  process.exit(1);
});
