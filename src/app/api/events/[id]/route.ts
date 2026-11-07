import { prisma } from "@/lib/prisma";
import { ApiError, json, notFound, readBody, route } from "@/lib/server/api";
import { requireWriter } from "@/lib/server/session";
import { eventColumns } from "@/lib/server/events";
import { assertLayerInTimeline, getDefaultLayer, toEventDTO, touchTimeline } from "@/lib/server/timelines";
import { eventFields } from "@/lib/domain/events";
import { eventFieldsSchema, eventUpdateSchema } from "@/lib/validation/schemas";
import type { TimelineEvent } from "@/types/api";

/** PATCH /api/events/:id — change any of an event's fields. */
export const PATCH = route<{ id: string }>(async (req, { params }) => {
  const user = await requireWriter();
  const { id } = await params;
  const patch = await readBody(req, eventUpdateSchema);

  const existing = await prisma.event.findFirst({
    where: { id, timeline: { userId: user.id } },
    include: { timeline: { select: { deletedAt: true } } },
  });
  if (!existing) throw notFound("That event");
  if (existing.timeline.deletedAt) throw new ApiError(409, "This timeline is in the trash. Restore it to make changes.");

  const defaultLayer = await getDefaultLayer(existing.timelineId);
  // Dropping the end year turns a period back into a single date, so the other end fields go too.
  const clearEnd = patch.endYear === null ? { endIsBce: null, endMonth: null, endDay: null } : {};
  const merged = eventFieldsSchema.parse({ ...eventFields(toEventDTO(existing, defaultLayer.id)), ...clearEnd, ...patch });
  if (patch.layerId !== undefined) await assertLayerInTimeline(patch.layerId, existing.timelineId);

  const row = await prisma.$transaction(async (tx) => {
    const updated = await tx.event.update({ where: { id }, data: eventColumns({ ...merged, notes: merged.notes ?? null }) });
    await touchTimeline(tx, existing.timelineId);
    return updated;
  });
  return json<TimelineEvent>(toEventDTO(row, defaultLayer.id));
});
