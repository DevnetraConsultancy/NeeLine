import { MAX_LAYER_NAME_LENGTH } from "@/lib/domain/layers";

/** Size limits shared by forms and the API. Kept apart from the zod schemas so pages can use them without loading zod. */
export const LIMITS = {
  timelineName: 120,
  timelineDescription: 5_000,
  eventTitle: 200,
  eventNotes: 10_000,
  layerName: MAX_LAYER_NAME_LENGTH,
  /** Per-account and per-timeline ceilings, so a public, guest-first launch cannot grow the database without bound. Generous for real use. */
  timelinesPerUser: 200,
  eventsPerTimeline: 20_000,
  importEvents: 5_000,
  /** Below Vercel's 4.5 MB request body limit, so the API sees the file rather than a bare 413. */
  importFileBytes: 4 * 1024 * 1024,
  bulkDeleteIds: 5_000,
} as const;
