// Utility: event metadata schema for layers and horizontal square bracket spans
export interface EventMetadata {
  layer: string;
  description: string | null;
  endYear: number | null;
  endIsBce: boolean | null;
  endMonth: number | null;
  endDay: number | null;
}

export function parseEventMetadata(rawDescription: string | null): EventMetadata {
  if (!rawDescription) {
    return {
      layer: "General",
      description: null,
      endYear: null,
      endIsBce: null,
      endMonth: null,
      endDay: null,
    };
  }

  // 1. Modern structured neeline-meta tag
  const metaMatch = rawDescription.match(/^<!--neeline-meta:([\s\S]*?)-->([\s\S]*)$/);
  if (metaMatch) {
    try {
      const parsed = JSON.parse(metaMatch[1]);
      return {
        layer: parsed.layer ? String(parsed.layer).trim() || "General" : "General",
        description: metaMatch[2].trim() || null,
        endYear:
          parsed.endYear !== undefined && parsed.endYear !== null
            ? Math.abs(parseInt(String(parsed.endYear), 10))
            : null,
        endIsBce:
          parsed.endIsBce !== undefined && parsed.endIsBce !== null
            ? Boolean(parsed.endIsBce)
            : null,
        endMonth:
          parsed.endMonth !== undefined && parsed.endMonth !== null
            ? Math.min(12, Math.max(1, parseInt(String(parsed.endMonth), 10)))
            : null,
        endDay:
          parsed.endDay !== undefined && parsed.endDay !== null
            ? Math.min(31, Math.max(1, parseInt(String(parsed.endDay), 10)))
            : null,
      };
    } catch {
      // ignore JSON parse error and fallback
    }
  }

  // 2. Legacy <!--layer:name--> tag
  const layerMatch = rawDescription.match(/^<!--layer:([^>]+)-->([\s\S]*)$/);
  if (layerMatch) {
    return {
      layer: layerMatch[1].trim() || "General",
      description: layerMatch[2].trim() || null,
      endYear: null,
      endIsBce: null,
      endMonth: null,
      endDay: null,
    };
  }

  return {
    layer: "General",
    description: rawDescription,
    endYear: null,
    endIsBce: null,
    endMonth: null,
    endDay: null,
  };
}

export function serializeEventMetadata(
  meta: {
    layer?: string | null;
    endYear?: number | null;
    endIsBce?: boolean | null;
    endMonth?: number | null;
    endDay?: number | null;
  },
  description: string | null
): string | null {
  const cleanDesc = description ? description.trim() : "";
  const layer = meta.layer && meta.layer.trim() ? meta.layer.trim() : "General";
  const hasSpan = meta.endYear !== undefined && meta.endYear !== null;
  const isCustomLayer = layer !== "General";

  if (!hasSpan && !isCustomLayer) {
    return cleanDesc || null;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payload: Record<string, any> = {};
  if (isCustomLayer) payload.layer = layer;
  if (hasSpan) {
    payload.endYear = Math.abs(meta.endYear!);
    payload.endIsBce = Boolean(meta.endIsBce);
    if (meta.endMonth) payload.endMonth = meta.endMonth;
    if (meta.endDay) payload.endDay = meta.endDay;
  }

  return `<!--neeline-meta:${JSON.stringify(payload)}-->${cleanDesc}`;
}
