import "server-only";
import type { Prisma } from "@prisma/client";
import type { EventFields } from "@/lib/domain/events";

/** Maps validated event fields to database columns. */
export function eventColumns(fields: Partial<EventFields>): Prisma.EventUncheckedUpdateInput {
  const data: Prisma.EventUncheckedUpdateInput = {};
  if (fields.title !== undefined) data.title = fields.title;
  if (fields.notes !== undefined) data.description = fields.notes;
  if (fields.year !== undefined) data.year = fields.year;
  if (fields.isBce !== undefined) data.isBce = fields.isBce;
  if (fields.month !== undefined) data.month = fields.month;
  if (fields.day !== undefined) data.day = fields.day;
  if (fields.color !== undefined) data.color = fields.color;
  if (fields.layerId !== undefined) data.layerId = fields.layerId;
  if (fields.endYear !== undefined) {
    const hasEnd = fields.endYear !== null;
    data.endYear = fields.endYear;
    data.endIsBce = hasEnd ? (fields.endIsBce ?? false) : null;
    data.endMonth = hasEnd ? (fields.endMonth ?? null) : null;
    data.endDay = hasEnd ? (fields.endDay ?? null) : null;
  }
  return data;
}

export function newEventColumns(timelineId: string, f: EventFields, id?: string): Prisma.EventCreateManyInput {
  const hasEnd = f.endYear !== null;
  return {
    ...(id ? { id } : {}),
    timelineId,
    layerId: f.layerId,
    title: f.title,
    description: f.notes,
    year: f.year,
    isBce: f.isBce,
    month: f.month,
    day: f.day,
    endYear: f.endYear,
    endIsBce: hasEnd ? (f.endIsBce ?? false) : null,
    endMonth: hasEnd ? f.endMonth : null,
    endDay: hasEnd ? f.endDay : null,
    color: f.color,
  };
}
