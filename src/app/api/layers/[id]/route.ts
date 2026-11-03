import { prisma } from "@/lib/prisma";
import { ApiError, json, notFound, readBody, route } from "@/lib/server/api";
import { requireWriter } from "@/lib/server/session";
import { ownedTimeline, toLayerDTO, touchTimeline } from "@/lib/server/timelines";
import { layerNameKey, normalizeLayerName } from "@/lib/domain/layers";
import { layerDeleteSchema, layerUpdateSchema } from "@/lib/validation/schemas";
import type { Layer, LayerDeleteResult } from "@/types/api";

type Params = { id: string };

async function ownedLayer(userId: string, layerId: string) {
  const layer = await prisma.layer.findFirst({ where: { id: layerId, timeline: { userId } } });
  if (!layer) throw notFound("That layer");
  await ownedTimeline(userId, layer.timelineId);
  return layer;
}

/** PATCH /api/layers/:id — rename, recolour or show/hide. Events follow by reference. */
export const PATCH = route<Params>(async (req, { params }) => {
  const user = await requireWriter();
  const { id } = await params;
  const layer = await ownedLayer(user.id, id);
  const input = await readBody(req, layerUpdateSchema);

  const data: { name?: string; nameKey?: string; color?: string; visible?: boolean } = {};
  if (input.name !== undefined) {
    const name = normalizeLayerName(input.name);
    if (layer.isDefault && name !== layer.name) throw new ApiError(400, "The General layer cannot be renamed.");
    const clash = await prisma.layer.findFirst({
      where: { timelineId: layer.timelineId, nameKey: layerNameKey(name), id: { not: id } },
      select: { id: true },
    });
    if (clash) throw new ApiError(409, `There is already a layer called "${name}".`);
    data.name = name;
    data.nameKey = layerNameKey(name);
  }
  if (input.color !== undefined) data.color = input.color;
  if (input.visible !== undefined) data.visible = input.visible;

  const updated = await prisma.layer.update({ where: { id }, data });
  return json<Layer>(toLayerDTO(updated));
});

/**
 * DELETE /api/layers/:id — body { mode }. "move-to-default" keeps the
 * layer's events on General; "delete-events" deletes them. Matching is by
 * layer id only, so notes that mention the layer name are never affected.
 */
export const DELETE = route<Params>(async (req, { params }) => {
  const user = await requireWriter();
  const { id } = await params;
  const layer = await ownedLayer(user.id, id);
  const { mode } = await readBody(req, layerDeleteSchema);
  if (layer.isDefault) throw new ApiError(400, "The General layer cannot be deleted.");

  const result = await prisma.$transaction(async (tx): Promise<LayerDeleteResult> => {
    const defaultLayer = await tx.layer.findFirstOrThrow({ where: { timelineId: layer.timelineId, isDefault: true } });
    const eventIds = (await tx.event.findMany({ where: { layerId: id }, select: { id: true } })).map((e) => e.id);

    if (mode === "delete-events") await tx.event.deleteMany({ where: { layerId: id } });
    else await tx.event.updateMany({ where: { layerId: id }, data: { layerId: defaultLayer.id } });

    await tx.layer.delete({ where: { id } });
    await touchTimeline(tx, layer.timelineId);
    return mode === "delete-events"
      ? { deletedEventIds: eventIds, movedToLayerId: null }
      : { deletedEventIds: [], movedToLayerId: defaultLayer.id };
  });
  return json<LayerDeleteResult>(result);
});
