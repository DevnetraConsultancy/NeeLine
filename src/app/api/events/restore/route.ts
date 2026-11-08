import { sortByDate } from "@/lib/domain/events";
import { prisma } from "@/lib/prisma";
import { ApiError, json, readBody, route } from "@/lib/server/api";
import { requireWriter } from "@/lib/server/session";
import { newEventColumns } from "@/lib/server/events";
import { getDefaultLayer, ownedTimeline, toEventDTO, touchTimeline } from "@/lib/server/timelines";
import { eventRestoreSchema } from "@/lib/validation/schemas";
import { LIMITS } from "@/lib/validation/limits";
import type { TimelineEvent } from "@/types/api";

/**
 * POST /api/events/restore — undo/redo puts deleted events back under their
 * original ids. Events whose layer has since been deleted go to General.
 * Ids that already exist are left untouched.
 */
export const POST = route(async (req) => {
  const user = await requireWriter();
  const { timelineId, events } = await readBody(req, eventRestoreSchema);
  await ownedTimeline(user.id, timelineId);

  const count = await prisma.event.count({ where: { timelineId } });
  if (count + events.length > LIMITS.eventsPerTimeline) {
    throw new ApiError(400, `Restoring these events would exceed the ${LIMITS.eventsPerTimeline.toLocaleString("en-US")}-event limit for a timeline.`);
  }

  const defaultLayer = await getDefaultLayer(timelineId);
  const layerIds = new Set(
    (await prisma.layer.findMany({ where: { timelineId }, select: { id: true } })).map((l) => l.id),
  );

  const rows = await prisma.$transaction(async (tx) => {
    await tx.event.createMany({
      data: events.map(({ id, ...fields }) =>
        newEventColumns(
          timelineId,
          { ...fields, notes: fields.notes ?? null, layerId: layerIds.has(fields.layerId) ? fields.layerId : defaultLayer.id },
          id,
        ),
      ),
      skipDuplicates: true,
    });
    await touchTimeline(tx, timelineId);
    return tx.event.findMany({ where: { timelineId, id: { in: events.map((e) => e.id) } } });
  });

  return json<TimelineEvent[]>(sortByDate(rows.map((r) => toEventDTO(r, defaultLayer.id))));
});
