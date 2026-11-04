import { test } from "node:test";
import assert from "node:assert/strict";
import {
  axisMarkers, baseX, buildScale, fitView, gapBadges, inView, layoutItems, panPreservingFocus,
  valueAtBaseX, zoomAt, BASE_PX_PER_YEAR, EVEN_SPACING, ZOOM_LIMITS, type LayoutInput,
  stackGeometry, spinePosition, pointCardTop, collapsedDotY, BELOW_SPINE, CANVAS_MARGIN, clampPan, stackScale,
} from "../../src/lib/domain/layout";
import { dateValue, type HistoricalDate } from "../../src/lib/domain/dates";

const d = (year: number, isBce = false, month: number | null = null): HistoricalDate => ({ year, isBce, month, day: null });
const ev = (id: string, start: HistoricalDate, end: HistoricalDate | null = null, title = id): LayoutInput =>
  ({ id, title, hasNotes: false, start, end });
const measure = (text: string) => text.length * 7;

test("layout: even mode spaces distinct dates evenly and interpolates between them", () => {
  const scale = buildScale("even", [-500, 0, 1947]);
  assert.equal(baseX(scale, 0) - baseX(scale, -500), EVEN_SPACING);
  assert.equal(baseX(scale, 1947) - baseX(scale, 0), EVEN_SPACING);
  assert.equal(baseX(scale, 0), 0, "anchors are centred");
  const mid = baseX(scale, 973.5);
  assert.ok(mid > 0 && mid < EVEN_SPACING);
  assert.ok(Math.abs(valueAtBaseX(scale, mid) - 973.5) < 1e-9);
});

test("layout: Jan and Dec of a year get different positions", () => {
  const values = [dateValue(d(1947, false, 1)), dateValue(d(1947, false, 12))];
  for (const mode of ["even", "proportional"] as const) {
    const scale = buildScale(mode, values);
    assert.notEqual(baseX(scale, values[0]), baseX(scale, values[1]), mode);
  }
});

test("layout: proportional mode is linear in years", () => {
  const scale = buildScale("proportional", []);
  assert.equal(baseX(scale, 100), 100 * BASE_PX_PER_YEAR);
  assert.equal(valueAtBaseX(scale, 5), 5 / BASE_PX_PER_YEAR);
});

test("layout: proportional zoom reaches days", () => {
  const pxPerDay = (BASE_PX_PER_YEAR * ZOOM_LIMITS.proportional.max) / 365;
  assert.ok(pxPerDay >= 8, `${pxPerDay} px per day`);
});

test("layout: zoomAt keeps the focus point still", () => {
  const view = { zoom: 1, panX: 40 };
  const width = 1000;
  const focus = 700;
  const worldBefore = (focus - width / 2 - view.panX) / view.zoom;
  const next = zoomAt("even", view, 2, focus, width);
  assert.equal(next.zoom, 2);
  assert.equal((focus - width / 2 - next.panX) / next.zoom, worldBefore);
});

test("layout: zoom is clamped per mode", () => {
  assert.equal(zoomAt("even", { zoom: 150, panX: 0 }, 10, 0, 100).zoom, ZOOM_LIMITS.even.max);
  assert.equal(zoomAt("proportional", { zoom: 150, panX: 0 }, 10, 0, 100).zoom, 1500);
});

test("layout: fitView centres the range", () => {
  const scale = buildScale("proportional", []);
  const view = fitView(scale, [-1000, 1000], 1200);
  assert.ok(view);
  assert.ok(Math.abs(view.panX) < 1e-9);
  assert.equal(fitView(scale, [], 1200), null);
  assert.deepEqual(fitView(scale, [100, 100], 1200), { zoom: 1, panX: -100 * BASE_PX_PER_YEAR });
});

test("layout: adding an anchor keeps the centred anchor on screen", () => {
  const prev = buildScale("even", [0, 100, 200]);
  const next = buildScale("even", [-50, 0, 100, 200]);
  const view = { zoom: 1, panX: 0 };
  const pan = panPreservingFocus(prev, next, view);
  assert.ok(pan !== null);
  assert.equal(baseX(next, 100) * view.zoom + pan, baseX(prev, 100) * view.zoom + view.panX);
});

test("layout: overlapping labels stack into tiers, then collapse", () => {
  const events = Array.from({ length: 6 }, (_, i) => ev(`e${i}`, d(100 + i), null, "A long event title"));
  const items = layoutItems(events, (v) => v, measure);
  const tiers = items.filter((i) => i.kind === "point" && !i.collapsed).map((i) => i.tier);
  assert.deepEqual(tiers, [0, 1, 2, 3]);
  assert.equal(items.filter((i) => i.kind === "point" && i.collapsed).length, 2);
});

test("layout: periods get bracket tiers and keep a minimum label width", () => {
  const items = layoutItems([ev("a", d(0), d(100)), ev("b", d(50), d(150))], (v) => v * 10, measure);
  const spans = items.filter((i) => i.kind === "span");
  assert.deepEqual(spans.map((s) => s.tier), [0, 1]);
  assert.ok(spans.every((s) => s.width >= 90));
});

test("layout: axis markers dedupe shared dates and prefer point colours", () => {
  const point = ev("p", d(100));
  const span = ev("s", d(100), d(200));
  const items = layoutItems([point, span], (v) => v * 10, measure);
  const markers = axisMarkers(items, (e) => (e.id === "p" ? "point" : "span"));
  assert.equal(markers.length, 2);
  assert.equal(markers.find((m) => m.key === 100)?.colorFrom, "point");
});

test("layout: gap badges use the shared year count", () => {
  const badges = gapBadges([{ id: "a", date: d(10, true) }, { id: "b", date: d(10) }], (v) => v * 10);
  assert.equal(badges[0].label, "19 yrs");
  assert.equal(gapBadges([{ id: "a", date: d(10) }, { id: "b", date: d(11) }], (v) => v).length, 0, "too narrow");
});

test("layout: culling", () => {
  assert.equal(inView(0, 10, 100, 200, 0), false);
  assert.equal(inView(0, 10, 100, 200, 100), true);
});

test("layout: the spine is anchored just below the canvas centre", () => {
  const items = layoutItems([ev("a", d(0), d(100)), ev("p", d(50))], (v) => v * 10, measure);
  const { above, bracketY } = stackGeometry(items);
  assert.ok(bracketY(0) < pointCardTop(0), "brackets sit above the point cards");
  assert.equal(spinePosition(800, above), 480, "60% of the canvas height");
  assert.equal(spinePosition(800, 10_000), 480, "a tall stack never pushes the axis down");
  const tall = spinePosition(100, above);
  assert.equal(tall, 100 - BELOW_SPINE - CANVAS_MARGIN, "a short canvas keeps the axis labels visible");
});

test("layout: collapsed dots sit below the first row of cards", () => {
  assert.ok(collapsedDotY > pointCardTop(0) + 24);
});

test("layout: fit leaves room for wide labels", () => {
  const scale = buildScale("proportional", []);
  const narrow = fitView(scale, [0, 1000], 1200)!;
  const wide = fitView(scale, [0, 1000], 1200, 300)!;
  assert.ok(wide.zoom < narrow.zoom);
});

test("layout: panning stops with a sliver of content still on screen", () => {
  // Content spans world pixels [-500, 500]; canvas is 1000 wide.
  assert.equal(clampPan(0, -500, 500, 1000), 0, "centred view is untouched");
  assert.equal(clampPan(99999, -500, 500, 1000), 880, "left edge keeps 120px visible");
  assert.equal(clampPan(-99999, -500, 500, 1000), -880, "right edge keeps 120px visible");
  assert.equal(clampPan(5000, -10, 10, 240), 70, "narrow screens keep a quarter visible");
});

test("layout: the stack shrinks to fit above the spine", () => {
  assert.equal(stackScale(200, 480), 1, "a stack that fits is untouched");
  assert.equal(stackScale(464, 480), 1, "exactly the available space still fits");
  assert.ok(Math.abs(stackScale(580, 480) - 464 / 580) < 1e-9, "a taller stack scales to fit");
  assert.equal(stackScale(5000, 480), 0.55, "shrinking stops at 55% for readability");
});
