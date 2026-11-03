import { MAX_LAYER_NAME_LENGTH } from "@/lib/domain/layers";

/** Size limits shared by forms and the API. Kept apart from the zod schemas so pages can use them without loading zod. */
export const LIMITS = {
  timelineName: 120,
  timelineDescription: 5_000,
  eventTitle: 200,
  eventNotes: 10_000,
  layerName: MAX_LAYER_NAME_LENGTH,
  importEvents: 5_000,
  importFileBytes: 5 * 1024 * 1024,
  bulkDeleteIds: 5_000,
} as const;
