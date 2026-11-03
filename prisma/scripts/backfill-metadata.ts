/**
 * One-off data migration: moves layer, period-end and timeline-description
 * metadata out of Event.description into real columns, and flags guest users.
 *
 *   npm run db:backfill -- --dry-run   # report only, writes nothing
 *   npm run db:backfill                # apply
 *
 * Safe to run more than once: events that already have a layer are skipped,
 * and timeline-level fields are set only the first time a timeline is seen.
 * The original description is copied to Event.legacyDescription.
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { backfillTimeline } from "../../src/lib/server/legacy-backfill";

const dryRun = process.argv.includes("--dry-run");
const LEGACY_GUEST_EMAIL_SUFFIX = "@chronoscope.local";

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set.");
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

  try {
    const timelines = await prisma.timeline.findMany({ select: { id: true }, orderBy: { createdAt: "asc" } });
    const totals = { timelinesSetUp: 0, colorsReset: 0, layersCreated: 0, eventsMoved: 0 };
    const warnings: string[] = [];

    for (const { id } of timelines) {
      const { plan } = await backfillTimeline(prisma, id, dryRun);
      totals.layersCreated += plan.newLayers.length;
      totals.eventsMoved += plan.eventUpdates.length;
      if (plan.timelineUpdate) totals.timelinesSetUp++;
      if (plan.timelineUpdate?.resetColors) totals.colorsReset++;
      warnings.push(...plan.warnings.map((w) => `Timeline ${id}: ${w}`));
    }

    const guestFilter = { isGuest: false, email: { endsWith: LEGACY_GUEST_EMAIL_SUFFIX } };
    const guests = dryRun
      ? await prisma.user.count({ where: guestFilter })
      : (await prisma.user.updateMany({ where: guestFilter, data: { isGuest: true } })).count;

    console.log(dryRun ? "DRY RUN - nothing was written." : "Backfill applied.");
    console.log(`Timelines scanned:          ${timelines.length}`);
    console.log(`Timelines set up:           ${totals.timelinesSetUp}`);
    console.log(`  colours now follow theme: ${totals.colorsReset}`);
    console.log(`Layers created:             ${totals.layersCreated}`);
    console.log(`Events moved to columns:    ${totals.eventsMoved}`);
    console.log(`Users flagged as guests:    ${guests}`);
    console.log(`Warnings:                   ${warnings.length}`);
    for (const w of warnings) console.log(`  - ${w}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
