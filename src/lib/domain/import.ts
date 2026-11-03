import { DEFAULT_EVENT_COLOR, isHexColor } from "@/lib/domain/colors";
import { hasLegacyTag, parseLegacyEventMetadata } from "@/lib/legacy/event-metadata";
import { layerNameKey } from "@/lib/domain/layers";
import { importEventSchema, LIMITS, type ImportEventInput } from "@/lib/validation/schemas";

/**
 * Reads a JSON chronicle file. Accepts the export format
 *   { format, timeline, layers: [{ name, color }], events: [...] }
 * or a bare array of events. Values are read leniently ("12", "true", -44)
 * and then checked with the same rules the server uses. Rows that fail are
 * reported and skipped, not silently changed.
 */

export interface ImportLayer {
  name: string;
  color: string;
}

export interface ParsedImport {
  events: ImportEventInput[];
  layers: ImportLayer[];
  /** One message per skipped row, e.g. "Row 4: The month must be between 1 and 12." */
  rowErrors: string[];
}

export class ImportFileError extends Error {}

type Raw = Record<string, unknown>;

function isBlank(value: unknown): boolean {
  return value === undefined || value === null || (typeof value === "string" && value.trim() === "");
}

/** "12", 12 and 12.0 become 12; anything else becomes NaN so validation reports it. */
function toNumber(value: unknown): number | null {
  if (isBlank(value)) return null;
  if (typeof value === "number") return value;
  if (typeof value === "string" && /^[-+]?\d+(\.0+)?$/.test(value.trim())) return Number(value.trim());
  return Number.NaN;
}

/** true, "true", 1, "yes" are true; false, "false", 0, "no" are false. */
function toBoolean(value: unknown): boolean | null {
  if (isBlank(value)) return null;
  if (typeof value === "boolean") return value;
  const s = String(value).trim().toLowerCase();
  if (["true", "1", "yes", "bce", "bc"].includes(s)) return true;
  if (["false", "0", "no", "ce", "ad"].includes(s)) return false;
  return null;
}

/**
 * A negative year always means BCE, whatever isBce says; otherwise isBce
 * decides. Returns the positive year and its era.
 */
function readYear(rawYear: unknown, rawIsBce: unknown): { year: number | null; isBce: boolean } {
  const year = toNumber(rawYear);
  const flag = toBoolean(rawIsBce);
  if (year === null || Number.isNaN(year)) return { year, isBce: flag ?? false };
  return { year: Math.abs(year), isBce: year < 0 ? true : (flag ?? false) };
}

function readText(value: unknown): string | null {
  if (isBlank(value)) return null;
  return typeof value === "string" ? value : String(value);
}

function normalizeRow(row: Raw, fallbackTitle: string): Raw {
  const start = readYear(row.year, row.isBce);
  const hasEnd = !isBlank(row.endYear);
  const end = hasEnd ? readYear(row.endYear, row.endIsBce) : { year: null, isBce: null };

  // Old exports may carry metadata tags inside the description.
  let notes = readText(row.description ?? row.notes);
  let layerName = readText(row.layer);
  if (hasLegacyTag(notes)) {
    const legacy = parseLegacyEventMetadata(notes);
    notes = legacy.notes;
    layerName ??= legacy.layer;
  }

  return {
    title: readText(row.title)?.trim() || fallbackTitle,
    notes,
    year: start.year,
    isBce: start.isBce,
    month: toNumber(row.month),
    day: toNumber(row.day),
    endYear: end.year,
    endIsBce: hasEnd ? end.isBce : null,
    endMonth: hasEnd ? toNumber(row.endMonth) : null,
    endDay: hasEnd ? toNumber(row.endDay) : null,
    color: isHexColor(row.color) ? row.color : DEFAULT_EVENT_COLOR,
    layerName,
  };
}

function readLayers(value: unknown): ImportLayer[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item: unknown) => {
    if (!item || typeof item !== "object") return [];
    const { name, color } = item as Raw;
    const cleanName = typeof name === "string" ? name.trim() : "";
    if (!cleanName || cleanName.length > LIMITS.layerName) return [];
    return [{ name: cleanName, color: isHexColor(color) ? color.toLowerCase() : DEFAULT_EVENT_COLOR }];
  });
}

export function parseImportFile(textContent: string): ParsedImport {
  let json: unknown;
  try {
    json = JSON.parse(textContent);
  } catch {
    throw new ImportFileError("This file is not valid JSON.");
  }

  const rows = Array.isArray(json) ? json : json && typeof json === "object" ? (json as Raw).events : undefined;
  if (!Array.isArray(rows)) {
    throw new ImportFileError("The file must be a list of events, or an object with an \"events\" list.");
  }
  if (rows.length === 0) throw new ImportFileError("The file has no events.");
  if (rows.length > LIMITS.importEvents) {
    throw new ImportFileError(`The file has ${rows.length.toLocaleString("en-US")} events; import at most ${LIMITS.importEvents.toLocaleString("en-US")} at a time.`);
  }

  const events: ImportEventInput[] = [];
  const rowErrors: string[] = [];
  rows.forEach((row: unknown, index) => {
    const label = `Row ${index + 1}`;
    if (!row || typeof row !== "object" || Array.isArray(row)) {
      rowErrors.push(`${label}: not an event object.`);
      return;
    }
    const parsed = importEventSchema.safeParse(normalizeRow(row as Raw, `Milestone ${index + 1}`));
    if (parsed.success) events.push(parsed.data);
    else rowErrors.push(`${label}: ${parsed.error.issues[0]?.message ?? "invalid event."}`);
  });

  // Only send colours for layers the events actually use (the server accepts at most 200).
  const used = new Set(events.flatMap((e) => (e.layerName ? [layerNameKey(e.layerName)] : [])));
  const layers = (Array.isArray(json) ? [] : readLayers((json as Raw).layers))
    .filter((l, i, all) => used.has(layerNameKey(l.name)) && all.findIndex((o) => layerNameKey(o.name) === layerNameKey(l.name)) === i)
    .slice(0, 200);
  return { events, layers, rowErrors };
}
