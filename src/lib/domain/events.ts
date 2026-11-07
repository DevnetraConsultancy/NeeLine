import { dateValue, type HistoricalDate } from "@/lib/domain/dates";

/** An event as the API returns it and the client holds it. */
export interface TimelineEvent {
  id: string;
  timelineId: string;
  layerId: string;
  year: number;
  isBce: boolean;
  month: number | null;
  day: number | null;
  endYear: number | null;
  endIsBce: boolean | null;
  endMonth: number | null;
  endDay: number | null;
  title: string;
  notes: string | null;
  color: string;
}

/** The editable fields of an event (everything except identity). */
export type EventFields = Omit<TimelineEvent, "id" | "timelineId">;

export function startDate(e: Pick<TimelineEvent, "year" | "isBce" | "month" | "day">): HistoricalDate {
  return { year: e.year, isBce: e.isBce, month: e.month, day: e.day };
}

export function endDate(e: Pick<TimelineEvent, "endYear" | "endIsBce" | "endMonth" | "endDay">): HistoricalDate | null {
  if (e.endYear === null) return null;
  return { year: e.endYear, isBce: e.endIsBce ?? false, month: e.endMonth, day: e.endDay };
}

export function eventFields(e: TimelineEvent): EventFields {
  const { id: _id, timelineId: _timelineId, ...fields } = e;
  return fields;
}

/**
 * Two events are duplicates when everything a reader sees matches: title,
 * dates, layer and notes (ignoring case and surrounding spaces). Colour is
 * not part of identity. Used only to skip duplicates during import.
 */
export function eventIdentityKey(
  e: Pick<EventFields, "title" | "notes" | "year" | "isBce" | "month" | "day" | "endYear" | "endIsBce" | "endMonth" | "endDay">,
  layerKey: string,
): string {
  const hasEnd = e.endYear !== null;
  return JSON.stringify([
    e.title.trim().toLowerCase(),
    e.year, e.isBce, e.month, e.day,
    hasEnd ? e.endYear : null, hasEnd ? Boolean(e.endIsBce) : null, hasEnd ? e.endMonth : null, hasEnd ? e.endDay : null,
    layerKey,
    (e.notes ?? "").trim().toLowerCase(),
  ]);
}

/** Chronological order by start date; stable for equal dates. */
export function sortByDate<T extends TimelineEvent>(events: T[]): T[] {
  return events
    .map((e, i) => ({ e, i, v: dateValue(startDate(e)) }))
    .sort((a, b) => a.v - b.v || a.i - b.i)
    .map(({ e }) => e);
}
