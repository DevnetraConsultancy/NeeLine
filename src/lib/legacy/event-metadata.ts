/**
 * Reader for the metadata format used before layers and period end dates had
 * their own columns. Older releases packed them into Event.description as
 *   <!--neeline-meta:{"layer":"Rome","endYear":44,"endIsBce":true}-->notes
 * or, earlier still,
 *   <!--layer:Rome-->notes
 *
 * Only the data migration and the legacy JSON import path use this. New code
 * reads and writes the real columns.
 */

export interface LegacyEventMetadata {
  layer: string;
  notes: string | null;
  endYear: number | null;
  endIsBce: boolean | null;
  endMonth: number | null;
  endDay: number | null;
  /** True when the description carried a tag that could not be read. */
  unreadable: boolean;
}

const META_PREFIX = "<!--neeline-meta:";
const TERMINATOR = "-->";
const DEFAULT_LAYER = "General";

function emptyMeta(notes: string | null): LegacyEventMetadata {
  return { layer: DEFAULT_LAYER, notes, endYear: null, endIsBce: null, endMonth: null, endDay: null, unreadable: false };
}

function toInt(value: unknown): number | null {
  if (value === undefined || value === null || String(value).trim() === "") return null;
  const n = parseInt(String(value), 10);
  return Number.isNaN(n) ? null : n;
}

function clampOrNull(value: unknown, min: number, max: number): number | null {
  const n = toInt(value);
  return n === null ? null : Math.min(max, Math.max(min, n));
}

function cleanNotes(text: string): string | null {
  return text.trim() || null;
}

/**
 * The old writer did not escape "-->" inside layer names, so the first
 * terminator is not always the real one. Try each terminator in turn and keep
 * the first that yields a JSON object.
 */
function readMetaTag(raw: string): { payload: Record<string, unknown>; rest: string } | null {
  let searchFrom = META_PREFIX.length;
  for (;;) {
    const end = raw.indexOf(TERMINATOR, searchFrom);
    if (end === -1) return null;
    try {
      const parsed: unknown = JSON.parse(raw.slice(META_PREFIX.length, end));
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return { payload: parsed as Record<string, unknown>, rest: raw.slice(end + TERMINATOR.length) };
      }
    } catch {
      // Not the real terminator; keep looking.
    }
    searchFrom = end + 1;
  }
}

export function parseLegacyEventMetadata(raw: string | null): LegacyEventMetadata {
  if (!raw) return emptyMeta(null);

  if (raw.startsWith(META_PREFIX)) {
    const tag = readMetaTag(raw);
    if (!tag) return { ...emptyMeta(raw), unreadable: true };
    const { payload, rest } = tag;

    const rawEndYear = toInt(payload.endYear);
    const endYear = rawEndYear === null ? null : Math.abs(rawEndYear);
    let endIsBce: boolean | null = null;
    if (endYear !== null) {
      if (typeof payload.endIsBce === "boolean") endIsBce = payload.endIsBce;
      else if (payload.endIsBce === "true" || payload.endIsBce === "false") endIsBce = payload.endIsBce === "true";
      else endIsBce = rawEndYear !== null && rawEndYear < 0;
    }

    const layer = payload.layer ? String(payload.layer).trim() : "";
    return {
      layer: layer || DEFAULT_LAYER,
      notes: cleanNotes(rest),
      endYear,
      endIsBce,
      endMonth: endYear === null ? null : clampOrNull(payload.endMonth, 1, 12),
      endDay: endYear === null ? null : clampOrNull(payload.endDay, 1, 31),
      unreadable: false,
    };
  }

  const legacyLayer = raw.match(/^<!--layer:([^>]+)-->([\s\S]*)$/);
  if (legacyLayer) {
    return { ...emptyMeta(cleanNotes(legacyLayer[2])), layer: legacyLayer[1].trim() || DEFAULT_LAYER };
  }

  return emptyMeta(raw);
}

/** Older JSON exports may still carry tagged descriptions; imports strip them. */
export function hasLegacyTag(raw: string | null | undefined): boolean {
  return Boolean(raw && (raw.startsWith(META_PREFIX) || raw.startsWith("<!--layer:")));
}
