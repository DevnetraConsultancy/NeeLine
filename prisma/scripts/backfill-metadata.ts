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
import { planTimelineBackfill, type TimelinePlan } from "../../src/lib/domain/backfill-plan";

const dryRun = process.argv.includes("--dry-run");
const GUEST_EMAIL_SUFFIX = "@chronoscope.local";

async function applyPlan(prisma: PrismaClient, plan: TimelinePlan): Promise<void> {
  await prisma.$transaction(async (tx) => {
    for (const layer of plan.newLayers) {
      await tx.layer.create({ data: { timelineId: plan.timelineId, ...layer } });
    }
    const layers = await tx.layer.findMany({
      where: { timelineId: plan.timelineId },
      select: { id: true, nameKey: true },
    });
    const idByKey = new Map(layers.map((l) => [l.nameKey, l.id]));

    for (const update of plan.eventUpdates) {
      const layerId = idByKey.get(update.layerKey);
      if (!layerId) throw new Error(`Layer "${update.layerKey}" missing for event ${update.id}`);
      await tx.event.update({
        where: { id: update.id, layerId: null },
        data: {
          layerId,
          description: update.description,
          legacyDescription: update.legacyDescription,
          endYear: update.endYear,
          endIsBce: update.endIsBce,
          endMonth: update.endMonth,
          endDay: update.endDay,
        },
      });
    }

    if (plan.timelineUpdate) {
      const { description, resetColors } = plan.timelineUpdate;
      await tx.timeline.update({
        where: { id: plan.timelineId },
        data: {
          description,
          ...(resetColors ? { bgColor: null, spineColor: null, tickColor: null, textColor: null } : {}),
        },
      });
    }
  });
}

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set.");
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

  try {
    const timelines = await prisma.timeline.findMany({
      select: { id: true, description: true, bgColor: true, spineColor: true, tickColor: true, textColor: true },
      orderBy: { createdAt: "asc" },
    });

    let layersCreated = 0;
    let eventsUpdated = 0;
    let timelinesUpdated = 0;
    let colorsReset = 0;
    const warnings: string[] = [];

    for (const timeline of timelines) {
      const [events, layers] = await Promise.all([
        prisma.event.findMany({
          where: { timelineId: timeline.id },
          select: { id: true, title: true, description: true, color: true, layerId: true },
          orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        }),
        prisma.layer.findMany({
          where: { timelineId: timeline.id },
          select: { id: true, nameKey: true, color: true, position: true, isDefault: true },
        }),
      ]);

      const plan = planTimelineBackfill(timeline, events, layers);
      layersCreated += plan.newLayers.length;
      eventsUpdated += plan.eventUpdates.length;
      if (plan.timelineUpdate) timelinesUpdated++;
      if (plan.timelineUpdate?.resetColors) colorsReset++;
      warnings.push(...plan.warnings.map((w) => `Timeline ${timeline.id}: ${w}`));

      const changes = plan.newLayers.length + plan.eventUpdates.length + (plan.timelineUpdate ? 1 : 0);
      if (!dryRun && changes > 0) await applyPlan(prisma, plan);
    }

    const guests = dryRun
      ? await prisma.user.count({ where: { isGuest: false, email: { endsWith: GUEST_EMAIL_SUFFIX } } })
      : (
          await prisma.user.updateMany({
            where: { isGuest: false, email: { endsWith: GUEST_EMAIL_SUFFIX } },
            data: { isGuest: true },
          })
        ).count;

    console.log(dryRun ? "DRY RUN - nothing was written." : "Backfill applied.");
    console.log(`Timelines scanned:          ${timelines.length}`);
    console.log(`Timelines set up:           ${timelinesUpdated}`);
    console.log(`  colours now follow theme: ${colorsReset}`);
    console.log(`Layers created:             ${layersCreated}`);
    console.log(`Events moved to columns:    ${eventsUpdated}`);
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
