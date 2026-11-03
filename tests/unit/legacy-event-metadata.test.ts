import { test } from "node:test";
import assert from "node:assert/strict";
import { hasLegacyTag, parseLegacyEventMetadata } from "../../src/lib/legacy/event-metadata";

test("legacy metadata: empty and plain text land on the default layer", () => {
  assert.deepEqual(parseLegacyEventMetadata(null), {
    layer: "General", notes: null, endYear: null, endIsBce: null, endMonth: null, endDay: null, unreadable: false,
  });
  const plain = parseLegacyEventMetadata("Just a note");
  assert.equal(plain.layer, "General");
  assert.equal(plain.notes, "Just a note");
});

test("legacy metadata: oldest <!--layer:--> tag", () => {
  const meta = parseLegacyEventMetadata("<!--layer:Roman Empire-->Founded");
  assert.equal(meta.layer, "Roman Empire");
  assert.equal(meta.notes, "Founded");
});

test("legacy metadata: structured tag with a period", () => {
  const meta = parseLegacyEventMetadata('<!--neeline-meta:{"layer":"Maurya","endYear":232,"endIsBce":true,"endMonth":3}-->Ashoka');
  assert.equal(meta.layer, "Maurya");
  assert.equal(meta.notes, "Ashoka");
  assert.equal(meta.endYear, 232);
  assert.equal(meta.endIsBce, true);
  assert.equal(meta.endMonth, 3);
});

test("legacy metadata: a period ending at year 0 keeps its end", () => {
  const meta = parseLegacyEventMetadata('<!--neeline-meta:{"endYear":0,"endIsBce":false}-->');
  assert.equal(meta.endYear, 0);
  assert.equal(meta.endIsBce, false);
  assert.equal(meta.notes, null);
});

test("legacy metadata: a layer name containing --> is recovered", () => {
  const meta = parseLegacyEventMetadata('<!--neeline-meta:{"layer":"A-->B"}-->tricky');
  assert.equal(meta.layer, "A-->B");
  assert.equal(meta.notes, "tricky");
  assert.equal(meta.unreadable, false);
});

test("legacy metadata: notes containing --> stay intact", () => {
  const meta = parseLegacyEventMetadata('<!--neeline-meta:{"layer":"Rome"}-->x --> y');
  assert.equal(meta.notes, "x --> y");
});

test("legacy metadata: a negative endYear without endIsBce means BCE", () => {
  const meta = parseLegacyEventMetadata('<!--neeline-meta:{"endYear":-50}-->');
  assert.equal(meta.endYear, 50);
  assert.equal(meta.endIsBce, true);
});

test("legacy metadata: a broken tag is kept as notes and flagged", () => {
  const raw = "<!--neeline-meta:{not json";
  const meta = parseLegacyEventMetadata(raw);
  assert.equal(meta.notes, raw);
  assert.equal(meta.unreadable, true);
});

test("legacy metadata: hasLegacyTag", () => {
  assert.equal(hasLegacyTag("<!--layer:x-->"), true);
  assert.equal(hasLegacyTag('<!--neeline-meta:{}-->'), true);
  assert.equal(hasLegacyTag("plain"), false);
  assert.equal(hasLegacyTag(null), false);
});
