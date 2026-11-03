import "server-only";
import type { Event as EventRow, Layer as LayerRow, Prisma, Timeline as TimelineRow } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError, notFound } from "@/lib/server/api";
import { backfillTimeline } from "@/lib/server/legacy-backfill";
import { DEFAULT_EVENT_COLOR } from "@/lib/domain/colors";
import { DEFAULT_LAYER_NAME, layerNameKey } from "@/lib/domain/layers";
import { sortByDate, type TimelineEvent } from "@/lib/domain/events";
import type { Layer, StudioData, TimelineDetail, TimelineSummary } from "@/types/api";

export const MAX_LAYERS_PER_TIMELINE = 200;

/** Loads a timeline the user owns. Trashed timelines are read-only. */
export async function ownedTimeline(
  userId: string,
  timelineId: string,
  { allowTrashed = false }: { allowTrashed?: boolean } = {},
): Promise<TimelineRow> {
  const timeline = await prisma.timeline.findFirst({ where: { id: timelineId, userId } });
  if (!timeline) throw notFound("That timeline");
  if (timeline.deletedAt && !allowTrashed) {
    throw new ApiError(409, "This timeline is in the trash. Restore it to make changes.");
  }
  return timeline;
}

/** Marks the timeline as changed so the dashboard sorts it first. */
export function touchTimeline(tx: Prisma.TransactionClient, timelineId: string) {
  return tx.timeline.update({ where: { id: timelineId }, data: { updatedAt: new Date() } });
}

export function defaultLayerData(timelineId: string) {
  return {
    timelineId,
    name: DEFAULT_LAYER_NAME,
    nameKey: layerNameKey(DEFAULT_LAYER_NAME),
    color: DEFAULT_EVENT_COLOR,
    position: 0,
    isDefault: true,
  };
}

export function toEventDTO(row: EventRow, defaultLayerId: string): TimelineEvent {
  return {
    id: row.id,
    timelineId: row.timelineId,
    layerId: row.layerId ?? defaultLayerId,
    year: row.year,
    isBce: row.isBce,
    month: row.month,
    day: row.day,
    endYear: row.endYear,
    endIsBce: row.endYear === null ? null : (row.endIsBce ?? false),
    endMonth: row.endYear === null ? null : row.endMonth,
    endDay: row.endYear === null ? null : row.endDay,
    title: row.title,
    notes: row.description,
    color: row.color,
  };
}

export function toLayerDTO(row: LayerRow, eventCount = 0): Layer {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    position: row.position,
    visible: row.visible,
    isDefault: row.isDefault,
    eventCount,
  };
}

export function toTimelineSummary(row: TimelineRow, eventCount: number): TimelineSummary {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    eventCount,
    deletedAt: row.deletedAt?.toISOString() ?? null,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function toTimelineDetail(row: TimelineRow, eventCount: number): TimelineDetail {
  return {
    ...toTimelineSummary(row, eventCount),
    colors: { bg: row.bgColor, spine: row.spineColor, tick: row.tickColor, text: row.textColor },
  };
}

export async function getDefaultLayer(timelineId: string): Promise<LayerRow> {
  const layer = await prisma.layer.findFirst({ where: { timelineId, isDefault: true } });
  if (layer) return layer;
  await backfillTimeline(prisma, timelineId);
  return prisma.layer.findFirstOrThrow({ where: { timelineId, isDefault: true } });
}

/** Everything the studio needs in one request. */
export async function loadStudio(userId: string, timelineId: string): Promise<StudioData> {
  const timeline = await ownedTimeline(userId, timelineId);

  const needsBackfill =
    (await prisma.layer.count({ where: { timelineId, isDefault: true } })) === 0 ||
    (await prisma.event.count({ where: { timelineId, layerId: null } })) > 0;
  if (needsBackfill) await backfillTimeline(prisma, timelineId);

  const [fresh, layerRows, eventRows] = await Promise.all([
    needsBackfill ? prisma.timeline.findUniqueOrThrow({ where: { id: timelineId } }) : Promise.resolve(timeline),
    prisma.layer.findMany({ where: { timelineId }, orderBy: [{ position: "asc" }, { createdAt: "asc" }] }),
    prisma.event.findMany({ where: { timelineId }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] }),
  ]);

  const defaultLayerId = layerRows.find((l) => l.isDefault)!.id;
  const events = sortByDate(eventRows.map((row) => toEventDTO(row, defaultLayerId)));
  const counts = new Map<string, number>();
  for (const e of events) counts.set(e.layerId, (counts.get(e.layerId) ?? 0) + 1);

  return {
    timeline: toTimelineDetail(fresh, events.length),
    layers: layerRows.map((l) => toLayerDTO(l, counts.get(l.id) ?? 0)),
    events,
  };
}

/** Throws unless the layer belongs to the timeline. */
export async function assertLayerInTimeline(layerId: string, timelineId: string): Promise<void> {
  const layer = await prisma.layer.findFirst({ where: { id: layerId, timelineId }, select: { id: true } });
  if (!layer) throw new ApiError(400, "That layer no longer exists. Choose another layer.");
}
