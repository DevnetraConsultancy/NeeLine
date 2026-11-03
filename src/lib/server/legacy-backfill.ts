import type { PrismaClient } from "@prisma/client";
import { planTimelineBackfill, type TimelinePlan } from "@/lib/domain/backfill-plan";

/**
 * Applies the metadata backfill to one timeline. Used by the one-off script
 * and, defensively, when the studio opens a timeline that still has
 * unconverted events (for example ones written by the previous release while
 * the new one was rolling out). Kept free of "server-only" so the script can
 * import it.
 */

export interface BackfillOutcome {
  plan: TimelinePlan;
  applied: boolean;
}

const BULK_SIZE = 500;

async function applyPlan(prisma: PrismaClient, plan: TimelinePlan): Promise<void> {
  await prisma.$transaction(async (tx) => {
    for (const layer of plan.newLayers) {
      await tx.layer.create({ data: { timelineId: plan.timelineId, ...layer } });
    }
    const layers = await tx.layer.findMany({ where: { timelineId: plan.timelineId }, select: { id: true, nameKey: true } });
    const idByKey = new Map(layers.map((l) => [l.nameKey, l.id]));

    // One bulk UPDATE per timeline: a query per event is far too slow when
    // the build machine is far from the database.
    const rows = plan.eventUpdates.map((update) => {
      const layerId = idByKey.get(update.layerKey);
      if (!layerId) throw new Error(`Layer "${update.layerKey}" missing for event ${update.id}`);
      return { ...update, layerId };
    });
    for (let start = 0; start < rows.length; start += BULK_SIZE) {
      const chunk = rows.slice(start, start + BULK_SIZE);
      await tx.$executeRaw`
        UPDATE "Event" AS e SET
          "layerId" = v.layer_id,
          "description" = v.description,
          "legacyDescription" = v.legacy,
          "endYear" = v.end_year,
          "endIsBce" = v.end_is_bce,
          "endMonth" = v.end_month,
          "endDay" = v.end_day
        FROM unnest(
          ${chunk.map((r) => r.id)}::text[],
          ${chunk.map((r) => r.layerId)}::text[],
          ${chunk.map((r) => r.description)}::text[],
          ${chunk.map((r) => r.legacyDescription)}::text[],
          ${chunk.map((r) => r.endYear)}::int[],
          ${chunk.map((r) => r.endIsBce)}::boolean[],
          ${chunk.map((r) => r.endMonth)}::int[],
          ${chunk.map((r) => r.endDay)}::int[]
        ) AS v(id, layer_id, description, legacy, end_year, end_is_bce, end_month, end_day)
        WHERE e."id" = v.id AND e."layerId" IS NULL`;
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
  }, { timeout: 120_000, maxWait: 30_000 });
}

export async function backfillTimeline(prisma: PrismaClient, timelineId: string, dryRun = false): Promise<BackfillOutcome> {
  const [timeline, events, layers] = await Promise.all([
    prisma.timeline.findUniqueOrThrow({
      where: { id: timelineId },
      select: { id: true, description: true, bgColor: true, spineColor: true, tickColor: true, textColor: true },
    }),
    prisma.event.findMany({
      where: { timelineId },
      select: { id: true, title: true, description: true, color: true, layerId: true },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    }),
    prisma.layer.findMany({
      where: { timelineId },
      select: { id: true, nameKey: true, color: true, position: true, isDefault: true },
    }),
  ]);

  const plan = planTimelineBackfill(timeline, events, layers);
  const hasChanges = plan.newLayers.length + plan.eventUpdates.length > 0 || plan.timelineUpdate !== null;
  if (!dryRun && hasChanges) await applyPlan(prisma, plan);
  return { plan, applied: !dryRun && hasChanges };
}
