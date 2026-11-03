import { sortByDate } from "@/lib/domain/events";
import { prisma } from "@/lib/prisma";
import { ApiError, json, readBody, route } from "@/lib/server/api";
import { requireWriter } from "@/lib/server/session";
import { enforce, RATE_RULES } from "@/lib/server/rate-limit";
import { newEventColumns } from "@/lib/server/events";
import {
  assertLayerInTimeline, getDefaultLayer, MAX_LAYERS_PER_TIMELINE, ownedTimeline, toEventDTO,
  toLayerDTO, touchTimeline,
} from "@/lib/server/timelines";
import { pickLayerColor } from "@/lib/domain/colors";
import { eventIdentityKey } from "@/lib/domain/events";
import { layerNameKey, normalizeLayerName } from "@/lib/domain/layers";
import { importRequestSchema } from "@/lib/validation/schemas";
import type { ImportResult } from "@/types/api";

/**
 * POST /api/events/import — add many events at once.
 * "single" puts every event on the chosen layer. "preserve" uses each event's
 * own layer name, creating layers that do not exist yet (with the colour from
 * the file when it has one). Exact duplicates of existing events, or of other
 * rows in the same file, are skipped and counted.
 */
export const POST = route(async (req) => {
  const user = await requireWriter();
  await enforce(RATE_RULES.import, user.id);
  const input = await readBody(req, importRequestSchema);
  await ownedTimeline(user.id, input.timelineId);
  await assertLayerInTimeline(input.targetLayerId, input.timelineId);

  const result = await prisma.$transaction(
    async (tx) => {
      const layers = await tx.layer.findMany({ where: { timelineId: input.timelineId } });
      const layerIdByKey = new Map(layers.map((l) => [l.nameKey, l.id]));
      const layerKeyById = new Map(layers.map((l) => [l.id, l.nameKey]));
      const fileColors = new Map(input.layers.map((l) => [layerNameKey(l.name), l.color]));
      const usedColors = layers.map((l) => l.color);
      let nextPosition = layers.reduce((max, l) => Math.max(max, l.position + 1), 0);
      const createdLayers: typeof layers = [];

      const resolveLayerId = async (layerName: string | null): Promise<string> => {
        if (input.mode === "single" || !layerName?.trim()) return input.targetLayerId;
        const name = normalizeLayerName(layerName);
        const key = layerNameKey(name);
        const existing = layerIdByKey.get(key);
        if (existing) return existing;
        if (layers.length + createdLayers.length >= MAX_LAYERS_PER_TIMELINE) {
          throw new ApiError(400, `A timeline can have at most ${MAX_LAYERS_PER_TIMELINE} layers.`);
        }
        const color = pickLayerColor(usedColors, fileColors.get(key), usedColors.length);
        const layer = await tx.layer.create({
          data: { timelineId: input.timelineId, name, nameKey: key, color, position: nextPosition++ },
        });
        usedColors.push(color);
        createdLayers.push(layer);
        layerIdByKey.set(key, layer.id);
        layerKeyById.set(layer.id, key);
        return layer.id;
      };

      const existingRows = await tx.event.findMany({ where: { timelineId: input.timelineId } });
      const defaultLayerId = layers.find((l) => l.isDefault)?.id ?? input.targetLayerId;
      const seen = new Set(
        existingRows.map((row) => {
          const dto = toEventDTO(row, defaultLayerId);
          return eventIdentityKey(dto, layerKeyById.get(dto.layerId) ?? "");
        }),
      );

      const toCreate = [];
      let skippedDuplicates = 0;
      for (const { layerName, ...event } of input.events) {
        const layerId = await resolveLayerId(layerName);
        const fields = { ...event, notes: event.notes ?? null, layerId };
        const key = eventIdentityKey(fields, layerKeyById.get(layerId) ?? "");
        if (seen.has(key)) {
          skippedDuplicates++;
          continue;
        }
        seen.add(key);
        toCreate.push(newEventColumns(input.timelineId, fields));
      }

      const created = toCreate.length > 0 ? await tx.event.createManyAndReturn({ data: toCreate }) : [];
      if (created.length > 0 || createdLayers.length > 0) await touchTimeline(tx, input.timelineId);
      return { created, createdLayers, skippedDuplicates };
    },
    { timeout: 30_000 },
  );

  const defaultLayer = await getDefaultLayer(input.timelineId);
  return json<ImportResult>(
    {
      created: sortByDate(result.created.map((r) => toEventDTO(r, defaultLayer.id))),
      createdLayers: result.createdLayers.map((l) => toLayerDTO(l)),
      skippedDuplicates: result.skippedDuplicates,
    },
    201,
  );
});
