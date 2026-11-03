import { prisma } from "@/lib/prisma";
import { json, readBody, route } from "@/lib/server/api";
import { requireUser, requireWriter } from "@/lib/server/session";
import { defaultLayerData, toTimelineSummary } from "@/lib/server/timelines";
import { timelineCreateSchema } from "@/lib/validation/schemas";
import { DEFAULT_EVENT_COLOR } from "@/lib/domain/colors";
import type { TimelineSummary } from "@/types/api";

/** GET /api/timelines?trash=1 — the user's active (or trashed) timelines. */
export const GET = route(async (req) => {
  const user = await requireUser();
  const inTrash = new URL(req.url).searchParams.get("trash") === "1";
  const rows = await prisma.timeline.findMany({
    where: { userId: user.id, deletedAt: inTrash ? { not: null } : null },
    include: { _count: { select: { events: true } } },
    orderBy: { updatedAt: "desc" },
  });
  return json<TimelineSummary[]>(rows.map((t) => toTimelineSummary(t, t._count.events)));
});

/** POST /api/timelines — create a timeline with its General layer and Year Zero marker event. */
export const POST = route(async (req) => {
  const user = await requireWriter();
  const input = await readBody(req, timelineCreateSchema);

  const created = await prisma.$transaction(async (tx) => {
    const timeline = await tx.timeline.create({
      data: {
        userId: user.id,
        name: input.name,
        description: input.description ?? null,
        bgColor: null,
        spineColor: null,
        tickColor: null,
        textColor: null,
      },
    });
    const layer = await tx.layer.create({ data: defaultLayerData(timeline.id) });
    await tx.event.create({
      data: { timelineId: timeline.id, layerId: layer.id, year: 0, isBce: false, title: "Year Zero", color: DEFAULT_EVENT_COLOR },
    });
    return timeline;
  });

  return json<TimelineSummary>(toTimelineSummary(created, 1), 201);
});
