import { test } from "node:test";
import assert from "node:assert/strict";
import { migrationUrl } from "../../prisma/scripts/deploy-migrate";

test("deploy-migrate: Supabase transaction pooler is switched to session mode", () => {
  const url = migrationUrl("postgresql://u:p@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require");
  assert.equal(url, "postgresql://u:p@aws-0-ap-south-1.pooler.supabase.com:5432/postgres?sslmode=require");
});

test("deploy-migrate: other URLs are left alone and DIRECT_URL wins", () => {
  const neon = "postgresql://u:p@ep-x-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require";
  assert.equal(migrationUrl(neon), neon);
  assert.equal(migrationUrl(neon, "postgresql://direct"), "postgresql://direct");
});
