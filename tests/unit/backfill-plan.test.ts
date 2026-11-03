import { test } from "node:test";
import assert from "node:assert/strict";
import {
  legacyTimelineDescription,
  planTimelineBackfill,
  usesOldDefaultColors,
  type BackfillEvent,
  type BackfillTimeline,
} from "../../src/lib/domain/backfill-plan";

const timeline = (over: Partial<BackfillTimeline> = {}): BackfillTimeline => ({
  id: "t1", description: null, bgColor: "#0a1628", spineColor: "#c9a84c", tickColor: "#c9a84c", textColor: "#f5f0e8", ...over,
});
const event = (id: string, title: string, description: string | null, over: Partial<BackfillEvent> = {}): BackfillEvent => ({
  id, title, description, color: "#c9a84c", layerId: null, ...over,
});

test("backfill: creates General first, then layers in order of first use", () => {
  const plan = planTimelineBackfill(timeline(), [
    event("e1", "Year Zero", "About"),
    event("e2", "A", '<!--neeline-meta:{"layer":"Rome"}-->', { color: "#f43f5e" }),
    event("e3", "B", "<!--layer:rome-->x"),
    event("e4", "C", '<!--neeline-meta:{"layer":"Greece"}-->'),
  ], []);
  assert.deepEqual(plan.newLayers.map((l) => [l.name, l.position, l.isDefault]), [
    ["General", 0, true], ["Rome", 1, false], ["Greece", 2, false],
  ]);
  assert.equal(plan.newLayers[1].color, "#f43f5e", "keeps the event's preset colour when free");
  assert.equal(plan.eventUpdates.find((u) => u.id === "e3")?.layerKey, "rome", "layer names match ignoring case");
});

test("backfill: layer colours never repeat while presets remain", () => {
  const plan = planTimelineBackfill(timeline(), [
    event("e1", "A", '<!--neeline-meta:{"layer":"X"}-->', { color: "#c9a84c" }),
  ], []);
  assert.notEqual(plan.newLayers[1].color, "#c9a84c", "General already uses gold");
});

test("backfill: copies the original text and moves notes and period end", () => {
  const raw = '<!--neeline-meta:{"layer":"Eras","endYear":0,"endIsBce":false}-->Long era';
  const [update] = planTimelineBackfill(timeline(), [event("e1", "Era", raw)], []).eventUpdates;
  assert.equal(update.legacyDescription, raw);
  assert.equal(update.description, "Long era");
  assert.equal(update.endYear, 0);
  assert.equal(update.endIsBce, false);
});

test("backfill: second run skips processed events and leaves the timeline alone", () => {
  const plan = planTimelineBackfill(
    timeline({ description: null }),
    [event("e1", "Year Zero", "About", { layerId: "L1" }), event("e2", "New", "<!--layer:Rome-->")],
    [{ id: "L1", nameKey: "general", color: "#c9a84c", position: 0, isDefault: true }],
  );
  assert.equal(plan.timelineUpdate, null, "a cleared description must not be refilled");
  assert.deepEqual(plan.eventUpdates.map((u) => u.id), ["e2"]);
  assert.deepEqual(plan.newLayers.map((l) => [l.name, l.position]), [["Rome", 1]]);
});

test("backfill: timeline description comes from Year Zero, else the first event", () => {
  assert.equal(legacyTimelineDescription([event("a", "First", "one"), event("b", "Year Zero", "zero")]), "zero");
  assert.equal(legacyTimelineDescription([event("a", "First", "<!--layer:X-->one")]), "one");
  assert.equal(legacyTimelineDescription([]), null);
});

test("backfill: only the old default looks follow the theme", () => {
  assert.equal(usesOldDefaultColors(timeline()), true);
  assert.equal(usesOldDefaultColors(timeline({ bgColor: "#070c16" })), true);
  assert.equal(usesOldDefaultColors(timeline({ bgColor: "#faf8f5", textColor: "#0f172a" })), true);
  assert.equal(usesOldDefaultColors(timeline({ bgColor: "#112233" })), false);
});

test("backfill: an unreadable tag produces a warning", () => {
  const plan = planTimelineBackfill(timeline(), [event("e1", "X", "<!--neeline-meta:{bad")], []);
  assert.equal(plan.warnings.length, 1);
  assert.equal(plan.eventUpdates[0].layerKey, "general");
});
