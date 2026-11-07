import { prisma } from "@/lib/prisma";
import { ApiError, json, readBody, route } from "@/lib/server/api";
import { requireWriter } from "@/lib/server/session";
import { ownedTimeline, touchTimeline } from "@/lib/server/timelines";
import { layerReorderSchema } from "@/lib/validation/schemas";

/** POST /api/layers/reorder — body { timelineId, orderedIds } listing every layer once. */
export const POST = route(async (req) => {
  const user = await requireWriter();
  const { timelineId, orderedIds } = await readBody(req, layerReorderSchema);
  await ownedTimeline(user.id, timelineId);

  const layers = await prisma.layer.findMany({ where: { timelineId }, select: { id: true } });
  const known = new Set(layers.map((l) => l.id));
  if (orderedIds.length !== known.size || new Set(orderedIds).size !== known.size || !orderedIds.every((id) => known.has(id))) {
    throw new ApiError(409, "The layer list changed. Reload and try again.");
  }

  await prisma.$transaction([
    ...orderedIds.map((id, position) => prisma.layer.update({ where: { id }, data: { position } })),
    touchTimeline(prisma, timelineId),
  ]);
  return json({ ok: true });
});
