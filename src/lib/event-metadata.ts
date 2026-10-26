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
      const rawEndYear =
        parsed.endYear !== undefined && parsed.endYear !== null
          ? parseInt(String(parsed.endYear), 10)
          : NaN;
      const validEndYear = !isNaN(rawEndYear) ? Math.abs(rawEndYear) : null;

      let endIsBce: boolean | null =
        parsed.endIsBce !== undefined && parsed.endIsBce !== null
          ? Boolean(parsed.endIsBce)
          : null;
      if (endIsBce === null && !isNaN(rawEndYear) && rawEndYear < 0) {
        endIsBce = true;
      }

      const rawEndMonth =
        parsed.endMonth !== undefined && parsed.endMonth !== null
          ? parseInt(String(parsed.endMonth), 10)
          : NaN;
      const validEndMonth = !isNaN(rawEndMonth)
        ? Math.min(12, Math.max(1, rawEndMonth))
        : null;

      const rawEndDay =
        parsed.endDay !== undefined && parsed.endDay !== null
          ? parseInt(String(parsed.endDay), 10)
          : NaN;
      const validEndDay = !isNaN(rawEndDay)
        ? Math.min(31, Math.max(1, rawEndDay))
        : null;

      return {
        layer: parsed.layer ? String(parsed.layer).trim() || "General" : "General",
        description: metaMatch[2].trim() || null,
        endYear: validEndYear,
        endIsBce: validEndYear !== null ? (endIsBce ?? false) : null,
        endMonth: validEndMonth,
        endDay: validEndDay,
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
  
  const rawEndYear =
    meta.endYear !== undefined && meta.endYear !== null
      ? parseInt(String(meta.endYear), 10)
      : NaN;
  const hasSpan = !isNaN(rawEndYear);
  const isCustomLayer = layer !== "General";

  if (!hasSpan && !isCustomLayer) {
    return cleanDesc || null;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payload: Record<string, any> = {};
  if (isCustomLayer) payload.layer = layer;
  if (hasSpan) {
    payload.endYear = Math.abs(rawEndYear);
    payload.endIsBce =
      meta.endIsBce !== undefined && meta.endIsBce !== null
        ? Boolean(meta.endIsBce)
        : rawEndYear < 0;

    const rawEndMonth =
      meta.endMonth !== undefined && meta.endMonth !== null
        ? parseInt(String(meta.endMonth), 10)
        : NaN;
    if (!isNaN(rawEndMonth)) {
      payload.endMonth = Math.min(12, Math.max(1, rawEndMonth));
    }

    const rawEndDay =
      meta.endDay !== undefined && meta.endDay !== null
        ? parseInt(String(meta.endDay), 10)
        : NaN;
    if (!isNaN(rawEndDay)) {
      payload.endDay = Math.min(31, Math.max(1, rawEndDay));
    }
  }

  return `<!--neeline-meta:${JSON.stringify(payload)}-->${cleanDesc}`;
}
