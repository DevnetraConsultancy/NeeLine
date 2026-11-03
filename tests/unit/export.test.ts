import { test } from "node:test";
import assert from "node:assert/strict";
import { eventsToTxt, slugify } from "../../src/lib/client/export";
import { buildExport, exportFileName } from "../../src/lib/domain/export-json";
import { parseImportFile } from "../../src/lib/domain/import";
import { contrastRatio } from "../../src/lib/domain/colors";
import { timeAgo } from "../../src/lib/time-ago";
import type { TimelineEvent } from "../../src/lib/domain/events";
import type { Layer, TimelineDetail } from "../../src/types/api";

const layer: Layer = { id: "L1", name: "Rome", color: "#f43f5e", position: 1, visible: true, isDefault: false, eventCount: 2 };
const timeline: TimelineDetail = {
  id: "t", name: "Ancient World", description: "About", eventCount: 2, deletedAt: null, updatedAt: "2026-01-01T00:00:00Z",
  colors: { bg: null, spine: null, tick: null, text: null },
};
const ev = (over: Partial<TimelineEvent>): TimelineEvent => ({
  id: "e", timelineId: "t", layerId: "L1", year: 44, isBce: true, month: 3, day: 15, endYear: null, endIsBce: null,
  endMonth: null, endDay: null, title: "Caesar", notes: "Ides\tof March", color: "#38bdf8", ...over,
});

test("export: TXT is sorted by date, tab-separated, with clean fields", () => {
  const txt = eventsToTxt([ev({ id: "b", year: 27, title: "Augustus", month: null, day: null, notes: null }), ev({ id: "a" })], [layer]);
  const lines = txt.split("\n");
  assert.equal(lines[0], "Date / Period\tLayer\tTitle\tNotes");
  assert.equal(lines[1], "Mar 15, 44 BCE\tRome\tCaesar\tIdes of March");
  assert.equal(lines[2], "27 BCE\tRome\tAugustus\t");
});

test("export: JSON round-trips through import, keeping layer colour and a year-0 end", () => {
  const events = [ev({}), ev({ id: "p", title: "Era", month: null, day: null, year: 10, endYear: 0, endIsBce: false, notes: null })];
  const file = buildExport(timeline, [layer], events, new Date("2026-01-01T00:00:00Z"));
  const parsed = parseImportFile(JSON.stringify(file));
  assert.equal(parsed.rowErrors.length, 0);
  assert.deepEqual(parsed.layers, [{ name: "Rome", color: "#f43f5e" }]);
  assert.equal(parsed.events[1].endYear, 0);
  assert.equal(parsed.events[0].color, "#38bdf8", "the card colour is not replaced by the layer colour");
  assert.equal(parsed.events[0].notes, "Ides\tof March");
});

test("export: file names", () => {
  assert.equal(exportFileName("Ancient World", "Rome: East/West"), "AncientWorld_RomeEastWest.json");
  assert.equal(slugify("Rise of Rome!"), "rise-of-rome");
  assert.equal(slugify("***"), "timeline");
});

test("colours: contrast ratio matches WCAG", () => {
  assert.equal(Math.round(contrastRatio("#000000", "#ffffff")), 21);
  assert.ok(contrastRatio("#7d5e10", "#faf8f5") >= 4.5, "light accent passes AA");
  assert.ok(contrastRatio("#c9a84c", "#faf8f5") < 4.5, "old gold on light fails");
});

test("dashboard: relative times", () => {
  const now = Date.parse("2026-11-03T12:00:00Z");
  assert.equal(timeAgo("2026-11-03T11:59:30Z", now), "just now");
  assert.equal(timeAgo("2026-11-03T11:00:00Z", now), "1 h ago");
  assert.equal(timeAgo("2026-11-01T12:00:00Z", now), "2 days ago");
  assert.equal(timeAgo("2026-01-01T12:00:00Z", now), "1 Jan 2026");
});
