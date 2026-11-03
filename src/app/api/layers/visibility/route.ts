import { prisma } from "@/lib/prisma";
import { json, readBody, route } from "@/lib/server/api";
import { requireWriter } from "@/lib/server/session";
import { ownedTimeline } from "@/lib/server/timelines";
import { layerVisibilitySchema } from "@/lib/validation/schemas";

/** POST /api/layers/visibility — body { timelineId, visibleIds }; every other layer is hidden. */
export const POST = route(async (req) => {
  const user = await requireWriter();
  const { timelineId, visibleIds } = await readBody(req, layerVisibilitySchema);
  await ownedTimeline(user.id, timelineId);

  await prisma.$transaction([
    prisma.layer.updateMany({ where: { timelineId, id: { in: visibleIds } }, data: { visible: true } }),
    prisma.layer.updateMany({ where: { timelineId, id: { notIn: visibleIds } }, data: { visible: false } }),
  ]);
  return json({ ok: true });
});
