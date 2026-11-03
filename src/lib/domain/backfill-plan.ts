import { parseLegacyEventMetadata } from "@/lib/legacy/event-metadata";
import { DEFAULT_EVENT_COLOR, pickLayerColor } from "@/lib/domain/colors";
import { DEFAULT_LAYER_NAME, layerNameKey, normalizeLayerName } from "@/lib/domain/layers";

/**
 * Pure planning step of the one-off data migration that moves layer, period
 * and timeline-description metadata out of Event.description into columns.
 * The runner in prisma/scripts applies the plan.
 */

export interface BackfillTimeline {
  id: string;
  description: string | null;
  bgColor: string | null;
  spineColor: string | null;
  tickColor: string | null;
  textColor: string | null;
}

export interface BackfillEvent {
  id: string;
  title: string;
  description: string | null;
  color: string;
  layerId: string | null;
}

export interface BackfillLayer {
  id: string;
  nameKey: string;
  color: string;
  position: number;
  isDefault: boolean;
}

export interface PlannedLayer {
  name: string;
  nameKey: string;
  color: string;
  position: number;
  isDefault: boolean;
}

export interface PlannedEventUpdate {
  id: string;
  layerKey: string;
  description: string | null;
  legacyDescription: string | null;
  endYear: number | null;
  endIsBce: boolean | null;
  endMonth: number | null;
  endDay: number | null;
}

export interface TimelinePlan {
  timelineId: string;
  newLayers: PlannedLayer[];
  eventUpdates: PlannedEventUpdate[];
  /** Set only the first time a timeline is processed. */
  timelineUpdate: {
    description: string | null;
    resetColors: boolean;
  } | null;
  warnings: string[];
}

const OLD_DEFAULT_LOOKS: ReadonlyArray<(t: BackfillTimeline) => boolean> = [
  // Schema default of the previous release.
  (t) => t.bgColor === "#0a1628" && t.spineColor === "#c9a84c" && t.textColor === "#f5f0e8",
  // The dark look the previous canvas treated as "follow the theme".
  (t) => t.bgColor === "#070c16" && t.spineColor === "#c9a84c" && t.textColor === "#f5f0e8",
  // The light looks the previous canvas treated as "follow the theme".
  (t) =>
    ["#fcfbf7", "#faf8f5", "#f5f0e8"].includes(t.bgColor ?? "") &&
    ["#0f172a", "#1a1a1a"].includes(t.textColor ?? ""),
];

export function usesOldDefaultColors(t: BackfillTimeline): boolean {
  return OLD_DEFAULT_LOOKS.some((matches) => matches(t));
}

/**
 * The previous release showed the notes of the "Year Zero" event (or, when
 * missing, the earliest-created event among the first five) as the timeline
 * description. `eventsByCreation` must be ordered by createdAt ascending.
 */
export function legacyTimelineDescription(eventsByCreation: BackfillEvent[]): string | null {
  const firstFive = eventsByCreation.slice(0, 5);
  const seed = firstFive.find((e) => e.title === "Year Zero") ?? firstFive[0];
  return seed ? parseLegacyEventMetadata(seed.description).notes : null;
}

export function planTimelineBackfill(
  timeline: BackfillTimeline,
  eventsByCreation: BackfillEvent[],
  existingLayers: BackfillLayer[],
): TimelinePlan {
  const warnings: string[] = [];
  const knownKeys = new Set(existingLayers.map((l) => l.nameKey));
  const usedColors = existingLayers.map((l) => l.color);
  let nextPosition = existingLayers.reduce((max, l) => Math.max(max, l.position + 1), 0);
  const newLayers: PlannedLayer[] = [];

  const addLayer = (rawName: string, preferredColor: string | null, isDefault: boolean) => {
    const name = normalizeLayerName(rawName);
    const nameKey = layerNameKey(name);
    if (knownKeys.has(nameKey)) return;
    const color = isDefault ? DEFAULT_EVENT_COLOR : pickLayerColor(usedColors, preferredColor, knownKeys.size);
    knownKeys.add(nameKey);
    usedColors.push(color);
    newLayers.push({ name, nameKey, color, position: isDefault ? 0 : nextPosition, isDefault });
    nextPosition = Math.max(nextPosition, isDefault ? 1 : nextPosition + 1);
  };

  const isFirstRun = !existingLayers.some((l) => l.isDefault);
  if (isFirstRun) addLayer(DEFAULT_LAYER_NAME, null, true);

  const eventUpdates: PlannedEventUpdate[] = [];
  for (const event of eventsByCreation) {
    if (event.layerId !== null) continue;
    const meta = parseLegacyEventMetadata(event.description);
    if (meta.unreadable) {
      warnings.push(`Event ${event.id}: metadata tag could not be read; kept the text as notes on the default layer.`);
    }
    addLayer(meta.layer, event.color, false);
    eventUpdates.push({
      id: event.id,
      layerKey: layerNameKey(meta.layer),
      description: meta.notes,
      legacyDescription: event.description,
      endYear: meta.endYear,
      endIsBce: meta.endIsBce,
      endMonth: meta.endMonth,
      endDay: meta.endDay,
    });
  }

  const timelineUpdate = isFirstRun
    ? {
        description: timeline.description ?? legacyTimelineDescription(eventsByCreation),
        resetColors: usesOldDefaultColors(timeline),
      }
    : null;

  return { timelineId: timeline.id, newLayers, eventUpdates, timelineUpdate, warnings };
}
