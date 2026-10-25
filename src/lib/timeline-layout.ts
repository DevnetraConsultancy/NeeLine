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
  layer?: string | null;
  x: number;
  tier: number;
  labelWidth: number;
  collapsed: boolean;
  // Horizontal square bracket period fields
  isSpan?: boolean;
  endYear?: number | null;
  endIsBce?: boolean | null;
  endMonth?: number | null;
  endDay?: number | null;
  startX?: number;
  endX?: number;
  x1?: number;
  x2?: number;
  spanWidth?: number;
  bracketTier?: number;
}

export const TIER_SPACING = 32; // vertical spacing between point label tiers
export const BRACKET_TIER_SPACING = 36; // vertical spacing between bracket tiers
const LABEL_GAP = 8; // horizontal gap between labels
const MAX_TIERS = 4;
const MAX_BRACKET_TIERS = 5;

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

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
    layer?: string | null;
    endYear?: number | null;
    endIsBce?: boolean | null;
    endMonth?: number | null;
    endDay?: number | null;
  }>,
  yearToX: (year: number) => number
): LayoutItem[] {
  if (events.length === 0) return [];

  // Separate point milestones and bracketed span periods
  const pointEvents = events.filter(
    (e) => e.endYear === undefined || e.endYear === null
  );
  const spanEvents = events.filter(
    (e) => e.endYear !== undefined && e.endYear !== null
  );

  // 1. Process Point Milestones
  const pointItems: LayoutItem[] = pointEvents
    .map((e) => {
      const effectiveYear = e.isBce ? -Math.abs(e.year) : e.year;
      const labelText = `${e.title}`;
      const labelWidth =
        measureTextWidth(labelText, '13px "Inter", sans-serif') + 24; // padding

      return {
        eventId: e.id,
        year: e.year,
        isBce: e.isBce,
        month: e.month,
        day: e.day,
        title: e.title,
        description: e.description,
        color: e.color,
        layer: e.layer,
        x: yearToX(effectiveYear),
        tier: 0,
        labelWidth,
        collapsed: false,
        isSpan: false,
      };
    })
    .sort((a, b) => a.x - b.x);

  // Point tier assignment: greedy, assign each label to lowest available tier
  const tierEdges: number[] = [];
  for (const item of pointItems) {
    const leftEdge = item.x - item.labelWidth / 2;
    const rightEdge = item.x + item.labelWidth / 2;

    let placed = false;
    for (let tier = 0; tier < MAX_TIERS; tier++) {
      const edge = tierEdges[tier] ?? -Infinity;
      if (leftEdge - edge >= LABEL_GAP) {
        item.tier = tier;
        item.collapsed = false;
        tierEdges[tier] = rightEdge;
        placed = true;
        break;
      }
    }

    if (!placed) {
      item.tier = 0;
      item.collapsed = true;
    }
  }

  // 2. Process Bracketed Period Spans
  const spanItems: LayoutItem[] = spanEvents.map((e) => {
    const startEy = e.isBce ? -Math.abs(e.year) : e.year;
    const endEy = e.endIsBce ? -Math.abs(e.endYear!) : e.endYear!;
    const startX = yearToX(startEy);
    const endX = yearToX(endEy);
    const x1 = Math.min(startX, endX);
    const x2 = Math.max(startX, endX);
    const spanWidth = Math.max(2, x2 - x1);
    const centerX = (x1 + x2) / 2;
    const labelWidth =
      measureTextWidth(e.title, '12.5px "Inter", sans-serif') + 36; // padding + note icon

    return {
      eventId: e.id,
      year: e.year,
      isBce: e.isBce,
      month: e.month,
      day: e.day,
      title: e.title,
      description: e.description,
      color: e.color,
      layer: e.layer,
      x: centerX,
      tier: 0,
      labelWidth,
      collapsed: false,
      isSpan: true,
      endYear: e.endYear,
      endIsBce: e.endIsBce,
      endMonth: e.endMonth,
      endDay: e.endDay,
      startX,
      endX,
      x1,
      x2,
      spanWidth,
      bracketTier: 0,
    };
  });

  // Sort bracket spans by x1 (earliest start)
  spanItems.sort((a, b) => (a.x1 ?? 0) - (b.x1 ?? 0));

  // Greedy tier assignment for bracket spans so overlapping periods stack neatly
  const bracketTierEdges: number[] = [];
  for (const span of spanItems) {
    const leftBound = (span.x1 ?? 0) - 8;
    const rightBound = (span.x2 ?? 0) + 8;

    let placed = false;
    for (let t = 0; t < MAX_BRACKET_TIERS; t++) {
      const edge = bracketTierEdges[t] ?? -Infinity;
      if (leftBound >= edge) {
        span.bracketTier = t;
        bracketTierEdges[t] = rightBound;
        placed = true;
        break;
      }
    }

    if (!placed) {
      span.bracketTier = MAX_BRACKET_TIERS - 1;
    }
  }

  return [...pointItems, ...spanItems];
}

export function formatSpanLabel(
  startYear: number,
  startBce: boolean,
  endYear: number,
  endBce: boolean
): string {
  const sNum = startBce ? -Math.abs(startYear) : startYear;
  const eNum = endBce ? -Math.abs(endYear) : endYear;
  const earlyNum = Math.min(sNum, eNum);
  const lateNum = Math.max(sNum, eNum);

  const sy = Math.abs(earlyNum).toLocaleString();
  const ey = Math.abs(lateNum).toLocaleString();
  const startEra = earlyNum < 0 ? "BCE" : "CE";
  const endEra = lateNum < 0 ? "BCE" : "CE";

  let diff = Math.abs(lateNum - earlyNum);
  if ((earlyNum < 0 && lateNum > 0) || (earlyNum > 0 && lateNum < 0)) {
    diff = Math.max(1, diff - 1);
  }
  const spanYears = diff === 1 ? "1 yr" : `${diff.toLocaleString()} yrs`;

  if (startEra === endEra) {
    return `${sy} – ${ey} ${startEra} (${spanYears})`;
  }
  return `${sy} ${startEra} – ${ey} ${endEra} (${spanYears})`;
}

export function formatDateLabel(
  year: number,
  isBce: boolean,
  month?: number | null,
  day?: number | null
): string {
  const era = isBce ? "BCE" : "CE";
  const formattedYear = year.toLocaleString();
  if (month && day && month >= 1 && month <= 12) {
    return `${MONTH_NAMES[month - 1]} ${day}, ${formattedYear} ${era}`;
  }
  if (month && month >= 1 && month <= 12) {
    return `${MONTH_NAMES[month - 1]} ${formattedYear} ${era}`;
  }
  return `${formattedYear} ${era}`;
}
