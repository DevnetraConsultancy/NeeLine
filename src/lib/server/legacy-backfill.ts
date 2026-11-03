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

async function applyPlan(prisma: PrismaClient, plan: TimelinePlan): Promise<void> {
  await prisma.$transaction(async (tx) => {
    for (const layer of plan.newLayers) {
      await tx.layer.create({ data: { timelineId: plan.timelineId, ...layer } });
    }
    const layers = await tx.layer.findMany({ where: { timelineId: plan.timelineId }, select: { id: true, nameKey: true } });
    const idByKey = new Map(layers.map((l) => [l.nameKey, l.id]));

    for (const update of plan.eventUpdates) {
      const layerId = idByKey.get(update.layerKey);
      if (!layerId) throw new Error(`Layer "${update.layerKey}" missing for event ${update.id}`);
      await tx.event.updateMany({
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
