import { dateValue, signedYear, yearsBetween, formatDateLabel, formatGap, type HistoricalDate } from "@/lib/domain/dates";

/**
 * Canvas geometry, independent of React. Positions are computed in "world"
 * pixels (zoom applied, pan not applied) so panning only shifts a transform
 * and never forces a relayout.
 *
 *   screenX = width / 2 + panX + worldX
 *   worldX  = baseX(value) * zoom
 */

export type LayoutMode = "even" | "proportional";

export const BASE_PX_PER_YEAR = 0.05;
export const EVEN_SPACING = 220;
/** Proportional mode can zoom to roughly 8 pixels per day. */
export const ZOOM_LIMITS: Record<LayoutMode, { min: number; max: number }> = {
  even: { min: 0.00001, max: 200 },
  proportional: { min: 0.00001, max: 60_000 },
};

export const TIER_SPACING = 32;
export const BRACKET_TIER_SPACING = 36;
export const MAX_POINT_TIERS = 4;
export const MAX_BRACKET_TIERS = 12;
const LABEL_GAP = 8;
const AXIS_LABEL_MIN_GAP = 52;
const GAP_BADGE_MIN_WIDTH = 50;

export interface Scale {
  mode: LayoutMode;
  /** Sorted, unique date values of every event start and end. */
  anchors: number[];
  anchorBase: Map<number, number>;
}

export function buildScale(mode: LayoutMode, values: Iterable<number>): Scale {
  const anchors = Array.from(new Set(values)).sort((a, b) => a - b);
  const anchorBase = new Map<number, number>();
  const start = (-(anchors.length - 1) * EVEN_SPACING) / 2;
  anchors.forEach((v, i) => anchorBase.set(v, start + i * EVEN_SPACING));
  return { mode, anchors, anchorBase };
}

/** Unzoomed world position of a date value. */
export function baseX(scale: Scale, value: number): number {
  if (scale.mode === "proportional") return value * BASE_PX_PER_YEAR;
  const { anchors, anchorBase } = scale;
  if (anchors.length === 0) return 0;
  const exact = anchorBase.get(value);
  if (exact !== undefined) return exact;

  const first = anchors[0];
  const last = anchors[anchors.length - 1];
  if (value <= first) return anchorBase.get(first)! + (value - first) * BASE_PX_PER_YEAR;
  if (value >= last) return anchorBase.get(last)! + (value - last) * BASE_PX_PER_YEAR;

  const i = upperIndex(anchors, value);
  const v0 = anchors[i - 1];
  const v1 = anchors[i];
  const b0 = anchorBase.get(v0)!;
  const b1 = anchorBase.get(v1)!;
  return b0 + ((value - v0) / (v1 - v0)) * (b1 - b0);
}

/** Inverse of baseX; outside the anchors, even mode clamps to the end anchors. */
export function valueAtBaseX(scale: Scale, x: number): number {
  if (scale.mode === "proportional") return x / BASE_PX_PER_YEAR;
  const { anchors, anchorBase } = scale;
  if (anchors.length === 0) return 0;
  const bases = anchors.map((v) => anchorBase.get(v)!);
  if (x <= bases[0]) return anchors[0];
  if (x >= bases[bases.length - 1]) return anchors[anchors.length - 1];
  const i = upperIndex(bases, x);
  const t = (x - bases[i - 1]) / (bases[i] - bases[i - 1]);
  return anchors[i - 1] + t * (anchors[i] - anchors[i - 1]);
}

/** First index whose value is greater than `target` (sorted input). */
function upperIndex(sorted: number[], target: number): number {
  let lo = 0;
  let hi = sorted.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (sorted[mid] <= target) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

export function clampZoom(mode: LayoutMode, zoom: number): number {
  const { min, max } = ZOOM_LIMITS[mode];
  return Math.min(max, Math.max(min, zoom));
}

export interface Viewport {
  zoom: number;
  panX: number;
}

/** Zoom by `factor`, keeping the point under `focusX` (screen px) still. */
export function zoomAt(mode: LayoutMode, view: Viewport, factor: number, focusX: number, width: number): Viewport {
  const zoom = clampZoom(mode, view.zoom * factor);
  const worldAtFocus = (focusX - width / 2 - view.panX) / view.zoom;
  return { zoom, panX: focusX - width / 2 - worldAtFocus * zoom };
}

/**
 * Viewport that frames the given date values. `edgePadding` (screen px on
 * each side) should leave room for the widest label at the ends.
 */
export function fitView(scale: Scale, values: number[], width: number, edgePadding?: number): Viewport | null {
  if (values.length === 0) return null;
  const bases = values.map((v) => baseX(scale, v));
  const min = Math.min(...bases);
  const max = Math.max(...bases);
  const span = max - min;
  const padding = Math.min(width / 3, Math.max(edgePadding ?? 0, scale.mode === "proportional" ? 100 : 140));
  const available = Math.max(200, width - padding * 2);
  if (span <= 0) return { zoom: 1, panX: -min };
  const raw = available / span;
  const zoom = clampZoom(scale.mode, scale.mode === "even" ? Math.min(1.25, raw) : raw);
  return { zoom, panX: -((min + max) / 2) * zoom };
}

/**
 * Keeps part of the timeline on screen: panX is limited so at least
 * `keep` pixels of content remain visible at either edge. contentLeft and
 * contentRight are world pixels (zoom already applied).
 */
export function clampPan(panX: number, contentLeft: number, contentRight: number, width: number, keep = 120): number {
  const margin = Math.min(keep, width / 4);
  const lowest = margin - width / 2 - contentRight;
  const highest = width / 2 - margin - contentLeft;
  return Math.min(highest, Math.max(lowest, panX));
}

/**
 * When events are added or removed in even mode the anchors shift. Keep the
 * anchor that was closest to the screen centre where it was.
 */
export function panPreservingFocus(prev: Scale, next: Scale, view: Viewport): number | null {
  let best: number | null = null;
  let bestDistance = Infinity;
  for (const [value, base] of prev.anchorBase) {
    if (!next.anchorBase.has(value)) continue;
    const distance = Math.abs(base * view.zoom + view.panX);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = value;
    }
  }
  if (best === null) return null;
  const prevScreen = prev.anchorBase.get(best)! * view.zoom + view.panX;
  return prevScreen - next.anchorBase.get(best)! * view.zoom;
}

// ─── Labels ───────────────────────────────────────────────────────────

export interface LayoutInput {
  id: string;
  title: string;
  hasNotes: boolean;
  start: HistoricalDate;
  end: HistoricalDate | null;
}

export type TextMeasurer = (text: string, fontSizePx: number) => number;

export interface PointLayout<T> {
  kind: "point";
  event: T;
  x: number;
  width: number;
  tier: number;
  collapsed: boolean;
}

export interface SpanLayout<T> {
  kind: "span";
  event: T;
  startX: number;
  endX: number;
  x1: number;
  x2: number;
  x: number;
  width: number;
  tier: number;
}

export type ItemLayout<T> = PointLayout<T> | SpanLayout<T>;

export const POINT_FONT_PX = 12.5;
export const SPAN_FONT_PX = 12;

export function layoutItems<T extends LayoutInput>(
  events: T[],
  worldX: (value: number) => number,
  measure: TextMeasurer,
): ItemLayout<T>[] {
  const points: PointLayout<T>[] = [];
  const spans: SpanLayout<T>[] = [];

  for (const event of events) {
    const title = event.title || "Untitled";
    if (event.end) {
      const startX = worldX(dateValue(event.start));
      const endX = worldX(dateValue(event.end));
      const x1 = Math.min(startX, endX);
      const x2 = Math.max(startX, endX);
      const width = Math.max(90, measure(title, SPAN_FONT_PX) + (event.hasNotes ? 36 : 24));
      spans.push({ kind: "span", event, startX, endX, x1, x2, x: (x1 + x2) / 2, width, tier: 0 });
    } else {
      const width = measure(title, POINT_FONT_PX) + (event.hasNotes ? 36 : 24);
      points.push({ kind: "point", event, x: worldX(dateValue(event.start)), width, tier: 0, collapsed: false });
    }
  }

  points.sort((a, b) => a.x - b.x);
  const tierRightEdges: number[] = [];
  for (const item of points) {
    const left = item.x - item.width / 2;
    const tier = tierRightEdges.findIndex((edge, t) => t < MAX_POINT_TIERS && left - edge >= LABEL_GAP);
    const freeTier = tier !== -1 ? tier : tierRightEdges.length < MAX_POINT_TIERS ? tierRightEdges.length : -1;
    if (freeTier === -1) {
      item.collapsed = true;
      continue;
    }
    item.tier = freeTier;
    tierRightEdges[freeTier] = item.x + item.width / 2;
  }

  spans.sort((a, b) => a.x1 - b.x1);
  const bracketRightEdges: number[] = [];
  for (const span of spans) {
    const left = Math.min(span.x1, span.x - span.width / 2) - 8;
    const right = Math.max(span.x2, span.x + span.width / 2) + 8;
    let tier = bracketRightEdges.findIndex((edge) => left >= edge);
    if (tier === -1) tier = bracketRightEdges.length < MAX_BRACKET_TIERS ? bracketRightEdges.length : MAX_BRACKET_TIERS - 1;
    span.tier = tier;
    bracketRightEdges[tier] = Math.max(bracketRightEdges[tier] ?? -Infinity, right);
  }

  return [...points, ...spans];
}

// ─── Vertical geometry (pixels relative to the spine; negative is up) ───

export const TICK = 14;
const CARD_HEIGHT = 24;
const BRACKET_LABEL_HALF = 13;
/** Row just above the spine where collapsed events sit as dots, clear of the cards. */
const COLLAPSED_ROW = 14;
/** Space the axis needs below the spine: date labels, the 0 badge and gap badges. */
export const BELOW_SPINE = 56;
/** Minimum gap between the canvas edge and the content. */
export const CANVAS_MARGIN = 16;

/** y of the dot for a collapsed event. */
export const collapsedDotY = -(TICK / 2 + 8);

/** Top edge of a point card on the given tier. */
export function pointCardTop(tier: number): number {
  return -(TICK / 2 + 8 + COLLAPSED_ROW + CARD_HEIGHT + tier * TIER_SPACING);
}

export interface StackGeometry {
  /** y of each bracket tier's crossbar. */
  bracketY: (tier: number) => number;
  /** Pixels the whole stack reaches above the spine. */
  above: number;
}

/**
 * Brackets start just above the highest point-card row actually in use, so
 * the stack is only as tall as it needs to be.
 */
export function stackGeometry<T>(items: ItemLayout<T>[]): StackGeometry {
  let pointTop = -(TICK / 2 + 8 + COLLAPSED_ROW);
  let maxBracketTier = -1;
  for (const item of items) {
    if (item.kind === "point") {
      if (!item.collapsed) pointTop = Math.min(pointTop, pointCardTop(item.tier));
    } else {
      maxBracketTier = Math.max(maxBracketTier, item.tier);
    }
  }
  const base = pointTop - 8 - BRACKET_LABEL_HALF;
  const bracketY = (tier: number) => base - tier * BRACKET_TIER_SPACING;
  const top = maxBracketTier >= 0 ? bracketY(maxBracketTier) - BRACKET_LABEL_HALF : pointTop;
  return { bracketY, above: -top };
}

/** Where the axis rests: just below the vertical centre of the canvas. */
export const SPINE_ANCHOR = 0.6;

/**
 * How much to shrink the stack (cards, brackets, their text) so it fits in
 * the space above the spine. 1 when it already fits; never below 0.55, so
 * labels stay readable - beyond that the top rows clip.
 */
export function stackScale(above: number, spineY: number): number {
  const available = spineY - CANVAS_MARGIN;
  if (above <= available) return 1;
  return Math.max(0.55, available / above);
}

/**
 * Spine position fixed slightly below the canvas centre, so the axis never
 * wanders as the stack grows: a stack taller than the space above it is
 * clipped at the top instead of pushing the axis to the bottom. On very
 * short canvases the axis labels stay visible.
 */
export function spinePosition(height: number, above: number): number {
  void above;
  return Math.round(Math.min(height * SPINE_ANCHOR, height - BELOW_SPINE - CANVAS_MARGIN));
}

// ─── Axis markers and gap badges ───────────────────────────────────────

export interface AxisMarker {
  key: number;
  x: number;
  date: HistoricalDate;
  label: string;
  colorFrom: string;
  showLabel: boolean;
  isZero: boolean;
}

export function axisMarkers<T extends LayoutInput>(
  items: ItemLayout<T>[],
  colorOf: (event: T) => string,
): AxisMarker[] {
  const byValue = new Map<number, AxisMarker & { fromSpan: boolean }>();
  const add = (date: HistoricalDate, x: number, event: T, fromSpan: boolean) => {
    const key = dateValue(date);
    const existing = byValue.get(key);
    if (existing && !(existing.fromSpan && !fromSpan)) return;
    byValue.set(key, {
      key, x, date, fromSpan,
      label: formatDateLabel(date),
      colorFrom: colorOf(event),
      showLabel: false,
      isZero: date.year === 0,
    });
  };
  for (const item of items) {
    if (item.kind === "point") add(item.event.start, item.x, item.event, false);
    else {
      add(item.event.start, item.startX, item.event, true);
      if (item.event.end) add(item.event.end, item.endX, item.event, true);
    }
  }

  const sorted = Array.from(byValue.values()).sort((a, b) => a.x - b.x);
  let lastLabelX = -Infinity;
  return sorted.map(({ fromSpan: _fromSpan, ...marker }) => {
    const showLabel = marker.x - lastLabelX >= AXIS_LABEL_MIN_GAP;
    if (showLabel) lastLabelX = marker.x;
    return { ...marker, showLabel };
  });
}

export interface GapBadge {
  key: string;
  x1: number;
  x2: number;
  label: string;
}

/** Year gaps between consecutive event starts, in date order. */
export function gapBadges(starts: { id: string; date: HistoricalDate }[], worldX: (value: number) => number): GapBadge[] {
  const sorted = [...starts].sort((a, b) => dateValue(a.date) - dateValue(b.date));
  const badges: GapBadge[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1].date;
    const cur = sorted[i].date;
    const years = yearsBetween(signedYear(prev.year, prev.isBce), signedYear(cur.year, cur.isBce));
    if (years === 0) continue;
    const x1 = worldX(dateValue(prev));
    const x2 = worldX(dateValue(cur));
    if (Math.abs(x2 - x1) < GAP_BADGE_MIN_WIDTH) continue;
    badges.push({ key: `${sorted[i - 1].id}-${sorted[i].id}`, x1, x2, label: formatGap(years) });
  }
  return badges;
}

/** True when [left, right] overlaps the visible world range plus a margin. */
export function inView(left: number, right: number, viewLeft: number, viewRight: number, margin = 200): boolean {
  return right >= viewLeft - margin && left <= viewRight + margin;
}
