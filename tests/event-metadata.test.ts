import { test } from "node:test";
import assert from "node:assert/strict";
import { parseEventMetadata, serializeEventMetadata } from "../src/lib/event-metadata";

test("event-metadata: parseEventMetadata with empty or plain text", () => {
  const empty = parseEventMetadata(null);
  assert.equal(empty.description, null);
  assert.equal(empty.layer, "General");
  assert.equal(empty.endYear, null);

  const plain = parseEventMetadata("Just a plain description");
  assert.equal(plain.description, "Just a plain description");
  assert.equal(plain.layer, "General");
  assert.equal(plain.endYear, null);
});

test("event-metadata: parseEventMetadata with legacy layer tag", () => {
  const res = parseEventMetadata("<!--layer:Roman Empire-->Historic capital city founded");
  assert.equal(res.description, "Historic capital city founded");
  assert.equal(res.layer, "Roman Empire");
});

test("event-metadata: serializeEventMetadata and parse roundtrip", () => {
  const serialized = serializeEventMetadata(
    {
      layer: "Mauryan Dynasty",
      endYear: 232,
      endIsBce: true,
    },
    "Reign of Emperor Ashoka"
  );

  assert.ok(serialized);
  assert.ok(serialized.startsWith("<!--neeline-meta:"));
  assert.ok(serialized.includes("Reign of Emperor Ashoka"));

  const parsed = parseEventMetadata(serialized);
  assert.equal(parsed.description, "Reign of Emperor Ashoka");
  assert.equal(parsed.layer, "Mauryan Dynasty");
  assert.equal(parsed.endYear, 232);
  assert.equal(parsed.endIsBce, true);
});

test("event-metadata: serialize with General layer and no span returns plain string", () => {
  const serialized = serializeEventMetadata(
    {
      layer: "General",
      endYear: null,
    },
    "Plain milestone"
  );
  assert.equal(serialized, "Plain milestone");
});

test("event-metadata: handles corrupted JSON gracefully", () => {
  const corrupted = "<!--neeline-meta:{invalid-json-->Preserved body";
  const parsed = parseEventMetadata(corrupted);
  assert.equal(parsed.description, corrupted);
});
