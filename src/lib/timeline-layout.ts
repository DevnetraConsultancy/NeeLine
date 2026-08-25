// Measures text width using an offscreen canvas
export function measureTextWidth(
  text: string,
  font: string = "13px Inter, sans-serif"
): number {
  if (typeof document === "undefined") return text.length * 7; // SSR fallback
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return text.length * 7;
  ctx.font = font;
  return ctx.measureText(text).width;
}

export interface LayoutItem {
  eventId: string;
  year: number;
  isBce: boolean;
  month: number | null;
  day: number | null;
  title: string;
  description: string | null;
  color: string;
  x: number;
  tier: number;
  labelWidth: number;
  collapsed: boolean;
}

export const TIER_SPACING = 28; // vertical spacing between label tiers
const LABEL_GAP = 6; // horizontal gap between labels
const MAX_TIERS = 4;

export function layoutLabels(
  events: Array<{
    id: string;
    year: number;
    isBce: boolean;
    month: number | null;
    day: number | null;
    title: string;
    description: string | null;
    color: string;
  }>,
  yearToX: (year: number) => number
): LayoutItem[] {
  if (events.length === 0) return [];

  // Create layout items sorted by x position
  const items: LayoutItem[] = events
    .map((e) => {
      const effectiveYear = e.isBce ? -Math.abs(e.year) : e.year;
      const labelText = `${e.title}`;
      const labelWidth =
        measureTextWidth(labelText, '13px "Inter", sans-serif') + 16; // padding

      return {
        eventId: e.id,
        year: e.year,
        isBce: e.isBce,
        month: e.month,
        day: e.day,
        title: e.title,
        description: e.description,
        color: e.color,
        x: yearToX(effectiveYear),
        tier: 0,
        labelWidth,
        collapsed: false,
      };
    })
    .sort((a, b) => a.x - b.x);

  // Tier assignment: greedy, assign each label to lowest available tier
  // Each tier tracks the rightmost edge of placed labels
  const tierEdges: number[] = []; // tierEdges[i] = rightmost x of tier i

  for (const item of items) {
    const leftEdge = item.x - item.labelWidth / 2;
    const rightEdge = item.x + item.labelWidth / 2;

    let placed = false;
    for (let tier = 0; tier < MAX_TIERS; tier++) {
      const edge = tierEdges[tier] ?? -Infinity;
      if (leftEdge - edge >= LABEL_GAP) {
        // Fits in this tier
        item.tier = tier;
        item.collapsed = false;
        tierEdges[tier] = rightEdge;
        placed = true;
        break;
      }
    }

    if (!placed) {
      // Doesn't fit in any tier — collapse to dot
      item.tier = 0;
      item.collapsed = true;
    }
  }

  return items;
}

export function formatDateLabel(
  year: number,
  isBce: boolean,
  month?: number | null,
  day?: number | null
): string {
  const era = isBce ? "BCE" : "CE";
  const formattedYear = year.toLocaleString();
  if (month && day) {
    return `${formattedYear} ${era}`;
  }
  if (month) {
    return `${formattedYear} ${era}`;
  }
  return `${formattedYear} ${era}`;
}
