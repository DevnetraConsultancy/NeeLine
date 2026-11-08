import { prisma } from "@/lib/prisma";
import { ApiError, json, notFound, readBody, route } from "@/lib/server/api";
import { requireWriter } from "@/lib/server/session";
import { newEventColumns } from "@/lib/server/events";
import { assertLayerInTimeline, getDefaultLayer, ownedTimeline, toEventDTO, touchTimeline } from "@/lib/server/timelines";
import { eventCreateSchema, eventDeleteSchema } from "@/lib/validation/schemas";
import { LIMITS } from "@/lib/validation/limits";
import type { TimelineEvent } from "@/types/api";

/** POST /api/events — add one event. */
export const POST = route(async (req) => {
  const user = await requireWriter();
  const { timelineId, ...fields } = await readBody(req, eventCreateSchema);
  await ownedTimeline(user.id, timelineId);
  await assertLayerInTimeline(fields.layerId, timelineId);

  const count = await prisma.event.count({ where: { timelineId } });
  if (count >= LIMITS.eventsPerTimeline) {
    throw new ApiError(400, `A timeline can have at most ${LIMITS.eventsPerTimeline.toLocaleString("en-US")} events.`);
  }

  const row = await prisma.$transaction(async (tx) => {
    const created = await tx.event.create({ data: newEventColumns(timelineId, { ...fields, notes: fields.notes ?? null }) });
    await touchTimeline(tx, timelineId);
    return created;
  });
  const defaultLayer = await getDefaultLayer(timelineId);
  return json<TimelineEvent>(toEventDTO(row, defaultLayer.id), 201);
});

/** DELETE /api/events — body { ids }. Deletes only events the user owns in active timelines. */
export const DELETE = route(async (req) => {
  const user = await requireWriter();
  const { ids } = await readBody(req, eventDeleteSchema);

  const targets = await prisma.event.findMany({
    where: { id: { in: ids }, timeline: { userId: user.id, deletedAt: null } },
    select: { id: true, timelineId: true },
  });
  if (targets.length === 0) throw notFound("Those events");

  await prisma.$transaction(async (tx) => {
    await tx.event.deleteMany({ where: { id: { in: targets.map((t) => t.id) } } });
    for (const timelineId of new Set(targets.map((t) => t.timelineId))) await touchTimeline(tx, timelineId);
  });
  return json({ deletedIds: targets.map((t) => t.id) });
});
