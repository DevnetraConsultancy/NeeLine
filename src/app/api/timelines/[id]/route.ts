import { prisma } from "@/lib/prisma";
import { ApiError, json, readBody, route } from "@/lib/server/api";
import { requireUser, requireWriter } from "@/lib/server/session";
import { loadStudio, ownedTimeline, toTimelineDetail } from "@/lib/server/timelines";
import { timelineUpdateSchema } from "@/lib/validation/schemas";
import type { StudioData, TimelineDetail } from "@/types/api";

type Params = { id: string };

/** GET /api/timelines/:id — timeline, layers and events for the studio. */
export const GET = route<Params>(async (_req, { params }) => {
  const user = await requireUser();
  const { id } = await params;
  return json<StudioData>(await loadStudio(user.id, id));
});

/** PATCH /api/timelines/:id — rename, describe or recolour. */
export const PATCH = route<Params>(async (req, { params }) => {
  const user = await requireWriter();
  const { id } = await params;
  await ownedTimeline(user.id, id);
  const input = await readBody(req, timelineUpdateSchema);

  const updated = await prisma.timeline.update({
    where: { id },
    data: input,
    include: { _count: { select: { events: true } } },
  });
  return json<TimelineDetail>(toTimelineDetail(updated, updated._count.events));
});

/** DELETE /api/timelines/:id — permanently delete a timeline that is already in the trash. */
export const DELETE = route<Params>(async (_req, { params }) => {
  const user = await requireWriter();
  const { id } = await params;
  const timeline = await ownedTimeline(user.id, id, { allowTrashed: true });
  if (!timeline.deletedAt) throw new ApiError(409, "Move the timeline to the trash before deleting it permanently.");
  await prisma.timeline.delete({ where: { id } });
  return json({ ok: true });
});
