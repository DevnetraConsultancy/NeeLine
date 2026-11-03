import { z } from "zod";
import { MAX_YEAR, compareDates, validateDate, type HistoricalDate } from "@/lib/domain/dates";
import { MAX_LAYER_NAME_LENGTH } from "@/lib/domain/layers";

/**
 * One set of rules for the browser forms and the API. The API re-validates
 * everything; client checks exist only to give faster, friendlier feedback.
 */

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

// No control characters other than tab and newline in free text.
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;

const text = (label: string, max: number) =>
  z
    .string({ error: `${label} must be text.` })
    .trim()
    .max(max, `${label} can be at most ${max.toLocaleString("en-US")} characters.`)
    .refine((v) => !CONTROL_CHARS.test(v), `${label} contains characters that are not allowed.`);

const requiredText = (label: string, max: number) => text(label, max).pipe(z.string().min(1, `${label} is required.`));

const optionalText = (label: string, max: number) =>
  z
    .union([text(label, max), z.null()])
    .optional()
    .transform((v) => (v ? v : v === undefined ? undefined : null));

export const idSchema = z.string().min(1).max(64).regex(/^[a-z0-9_-]+$/i, "Invalid id.");
export const hexColorSchema = z.string().regex(/^#[0-9a-f]{6}$/i, "Colours must look like #a1b2c3.").transform((v) => v.toLowerCase());

const yearSchema = z
  .number({ error: "The year must be a number." })
  .int("The year must be a whole number.")
  .min(0, "Enter the year without a minus sign and choose BCE instead.")
  .max(MAX_YEAR, `Years up to ${MAX_YEAR.toLocaleString("en-US")} are supported.`);
const monthSchema = z.number().int().min(1).max(12).nullable();
const daySchema = z.number().int().min(1).max(31).nullable();

const eventShape = {
  title: requiredText("Title", LIMITS.eventTitle),
  notes: optionalText("Notes", LIMITS.eventNotes),
  year: yearSchema,
  isBce: z.boolean(),
  month: monthSchema,
  day: daySchema,
  endYear: yearSchema.nullable(),
  endIsBce: z.boolean().nullable(),
  endMonth: monthSchema,
  endDay: daySchema,
  color: hexColorSchema,
  layerId: idSchema,
};

type DateFields = {
  year?: number; isBce?: boolean; month?: number | null; day?: number | null;
  endYear?: number | null; endIsBce?: boolean | null; endMonth?: number | null; endDay?: number | null;
};

/** Cross-field date rules shared by create, update and import. */
export function checkEventDates(value: DateFields, ctx: z.RefinementCtx): void {
  if (value.year === undefined || value.isBce === undefined) return;
  const start: HistoricalDate = { year: value.year, isBce: value.isBce, month: value.month ?? null, day: value.day ?? null };
  const startProblem = validateDate(start, "Start");
  if (startProblem) ctx.addIssue({ code: "custom", message: startProblem, path: ["day"] });

  if (value.endYear === null || value.endYear === undefined) {
    if (value.endMonth || value.endDay) {
      ctx.addIssue({ code: "custom", message: "Enter an end year for the period.", path: ["endYear"] });
    }
    return;
  }
  const end: HistoricalDate = {
    year: value.endYear,
    isBce: value.endIsBce ?? false,
    month: value.endMonth ?? null,
    day: value.endDay ?? null,
  };
  const endProblem = validateDate(end, "End");
  if (endProblem) ctx.addIssue({ code: "custom", message: endProblem, path: ["endDay"] });
  else if (!startProblem && compareDates(end, start) < 0) {
    ctx.addIssue({ code: "custom", message: "The period must end on or after its start.", path: ["endYear"] });
  }
}

export const eventCreateSchema = z
  .object({ timelineId: idSchema, ...eventShape })
  .superRefine(checkEventDates);

export const eventUpdateSchema = z.object(eventShape).partial().strict();

/** Validates an existing event merged with an update. */
export const eventFieldsSchema = z.object(eventShape).superRefine(checkEventDates);

/** Undo and redo put deleted events back under their original ids. */
export const eventRestoreSchema = z.object({
  timelineId: idSchema,
  events: z
    .array(z.object({ id: idSchema, ...eventShape }).superRefine(checkEventDates))
    .min(1)
    .max(LIMITS.importEvents),
});

export const eventDeleteSchema = z.object({
  ids: z.array(idSchema).min(1, "Nothing to delete.").max(LIMITS.bulkDeleteIds),
});

export const importEventSchema = z
  .object({
    title: requiredText("Title", LIMITS.eventTitle),
    notes: optionalText("Notes", LIMITS.eventNotes),
    year: yearSchema,
    isBce: z.boolean(),
    month: monthSchema,
    day: daySchema,
    endYear: yearSchema.nullable(),
    endIsBce: z.boolean().nullable(),
    endMonth: monthSchema,
    endDay: daySchema,
    color: hexColorSchema,
    layerName: text("Layer", LIMITS.layerName).nullable(),
  })
  .superRefine(checkEventDates);

export const importRequestSchema = z.object({
  timelineId: idSchema,
  /** "single": everything goes to targetLayerId. "preserve": use each event's layerName, creating missing layers. */
  mode: z.enum(["single", "preserve"]),
  targetLayerId: idSchema,
  layers: z
    .array(z.object({ name: requiredText("Layer", LIMITS.layerName), color: hexColorSchema }))
    .max(200)
    .default([]),
  events: z.array(importEventSchema).min(1, "The file has no events.").max(LIMITS.importEvents, `Import at most ${LIMITS.importEvents.toLocaleString("en-US")} events at a time.`),
});

const canvasColor = hexColorSchema.nullable();

export const timelineCreateSchema = z.object({
  name: requiredText("Name", LIMITS.timelineName),
  description: optionalText("Description", LIMITS.timelineDescription),
});

export const timelineUpdateSchema = z
  .object({
    name: requiredText("Name", LIMITS.timelineName),
    description: optionalText("Description", LIMITS.timelineDescription),
    bgColor: canvasColor,
    spineColor: canvasColor,
    tickColor: canvasColor,
    textColor: canvasColor,
  })
  .partial()
  .strict();

const layerName = requiredText("Layer name", LIMITS.layerName);

export const layerCreateSchema = z.object({
  timelineId: idSchema,
  name: layerName,
  color: hexColorSchema,
});

export const layerUpdateSchema = z
  .object({ name: layerName, color: hexColorSchema, visible: z.boolean() })
  .partial()
  .strict();

export const layerReorderSchema = z.object({
  timelineId: idSchema,
  orderedIds: z.array(idSchema).min(1).max(500),
});

export const layerVisibilitySchema = z.object({
  timelineId: idSchema,
  visibleIds: z.array(idSchema).max(500),
});

export const layerDeleteSchema = z.object({
  mode: z.enum(["move-to-default", "delete-events"], { error: "Choose whether to keep or delete the layer's events." }),
});

export type EventCreateInput = z.infer<typeof eventCreateSchema>;
export type EventUpdateInput = z.infer<typeof eventUpdateSchema>;
export type ImportEventInput = z.infer<typeof importEventSchema>;
export type ImportRequest = z.infer<typeof importRequestSchema>;
export type TimelineUpdateInput = z.infer<typeof timelineUpdateSchema>;

/** First human-readable problem in a failed parse. */
export function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? "The request was not valid.";
}
