import { prisma } from "@/lib/prisma";
import { ApiError, json, readBody, route } from "@/lib/server/api";
import { requireWriter } from "@/lib/server/session";
import { MAX_LAYERS_PER_TIMELINE, ownedTimeline, toLayerDTO, touchTimeline } from "@/lib/server/timelines";
import { layerNameKey, normalizeLayerName } from "@/lib/domain/layers";
import { layerCreateSchema } from "@/lib/validation/schemas";
import type { Layer } from "@/types/api";

/** POST /api/layers — add an (empty) layer at the end of the list, with the colour the user chose. */
export const POST = route(async (req) => {
  const user = await requireWriter();
  const input = await readBody(req, layerCreateSchema);
  await ownedTimeline(user.id, input.timelineId);

  const name = normalizeLayerName(input.name);
  const existing = await prisma.layer.findMany({ where: { timelineId: input.timelineId }, select: { nameKey: true, position: true } });
  if (existing.length >= MAX_LAYERS_PER_TIMELINE) {
    throw new ApiError(400, `A timeline can have at most ${MAX_LAYERS_PER_TIMELINE} layers.`);
  }
  if (existing.some((l) => l.nameKey === layerNameKey(name))) {
    throw new ApiError(409, `There is already a layer called "${name}".`);
  }

  const layer = await prisma.$transaction(async (tx) => {
    const created = await tx.layer.create({
      data: {
        timelineId: input.timelineId,
        name,
        nameKey: layerNameKey(name),
        color: input.color,
        position: existing.reduce((max, l) => Math.max(max, l.position + 1), 0),
      },
    });
    // Like every other change, a new layer counts as activity on the dashboard.
    await touchTimeline(tx, input.timelineId);
    return created;
  });
  return json<Layer>(toLayerDTO(layer), 201);
});
