import type { TimelineEvent } from "@/lib/domain/events";
import type { Layer, TimelineDetail } from "@/types/api";

/** File format shared by export and import ("neeline-chronicle-v1"). */
export interface ChronicleFile {
  format: "neeline-chronicle-v1";
  exportedAt: string;
  timeline: {
    name: string;
    description: string | null;
    bgColor: string | null;
    spineColor: string | null;
    tickColor: string | null;
    textColor: string | null;
  };
  layers: Array<{ name: string; color: string }>;
  events: Array<{
    title: string;
    year: number;
    isBce: boolean;
    month: number | null;
    day: number | null;
    endYear: number | null;
    endIsBce: boolean | null;
    endMonth: number | null;
    endDay: number | null;
    color: string;
    layer: string;
    description: string | null;
  }>;
}

export function buildExport(timeline: TimelineDetail, layers: Layer[], events: TimelineEvent[], now: Date): ChronicleFile {
  const nameOf = new Map(layers.map((l) => [l.id, l.name]));
  return {
    format: "neeline-chronicle-v1",
    exportedAt: now.toISOString(),
    timeline: {
      name: timeline.name,
      description: timeline.description,
      bgColor: timeline.colors.bg,
      spineColor: timeline.colors.spine,
      tickColor: timeline.colors.tick,
      textColor: timeline.colors.text,
    },
    layers: layers.map((l) => ({ name: l.name, color: l.color })),
    events: events.map((e) => ({
      title: e.title,
      year: e.year,
      isBce: e.isBce,
      month: e.month,
      day: e.day,
      // Kept as-is so a period ending at year 0 survives the round trip.
      endYear: e.endYear,
      endIsBce: e.endYear === null ? null : e.endIsBce,
      endMonth: e.endYear === null ? null : e.endMonth,
      endDay: e.endYear === null ? null : e.endDay,
      color: e.color,
      layer: nameOf.get(e.layerId) ?? "General",
      description: e.notes,
    })),
  };
}

export function exportFileName(timelineName: string, layerName: string): string {
  const clean = (s: string, fallback: string) => s.trim().replace(/[\\/:*?"<>|]/g, "").replace(/\s+/g, "") || fallback;
  return `${clean(timelineName, "Timeline")}_${clean(layerName, "Layer")}.json`;
}
