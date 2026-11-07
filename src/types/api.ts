import type { TimelineEvent } from "@/lib/domain/events";

/** Shapes returned by the API. Dates are ISO strings. */

export interface CanvasColors {
  bg: string | null;
  spine: string | null;
  tick: string | null;
  text: string | null;
}

export interface TimelineSummary {
  id: string;
  name: string;
  description: string | null;
  eventCount: number;
  deletedAt: string | null;
  updatedAt: string;
}

export interface TimelineDetail extends TimelineSummary {
  colors: CanvasColors;
}

export interface Layer {
  id: string;
  name: string;
  color: string;
  position: number;
  visible: boolean;
  isDefault: boolean;
  eventCount: number;
}

export interface StudioData {
  timeline: TimelineDetail;
  layers: Layer[];
  events: TimelineEvent[];
}

export interface ImportResult {
  created: TimelineEvent[];
  createdLayers: Layer[];
  skippedDuplicates: number;
}

export interface LayerDeleteResult {
  deletedEventIds: string[];
  movedToLayerId: string | null;
}

export type { TimelineEvent };
