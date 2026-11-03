import { test } from "node:test";
import assert from "node:assert/strict";
import { ImportFileError, parseImportFile } from "../../src/lib/domain/import";

test("import: reads the export format with layers and colours", () => {
  const file = JSON.stringify({
    format: "neeline-chronicle-v1",
    layers: [{ name: "Rome", color: "#F43F5E" }],
    events: [{ title: "Caesar", year: 44, isBce: true, month: 3, day: 15, layer: "Rome", color: "#38bdf8", description: "Ides" }],
  });
  const { events, layers, rowErrors } = parseImportFile(file);
  assert.deepEqual(layers, [{ name: "Rome", color: "#f43f5e" }]);
  assert.equal(rowErrors.length, 0);
  assert.equal(events[0].layerName, "Rome");
  assert.equal(events[0].notes, "Ides");
  assert.equal(events[0].color, "#38bdf8");
});

test("import: string booleans are read correctly", () => {
  const { events } = parseImportFile(JSON.stringify([{ title: "x", year: "50", isBce: "false" }]));
  assert.equal(events[0].isBce, false);
  assert.equal(events[0].year, 50);
});

test("import: a negative year is always BCE", () => {
  const { events } = parseImportFile(JSON.stringify([{ title: "x", year: -50, isBce: false }]));
  assert.equal(events[0].year, 50);
  assert.equal(events[0].isBce, true);
});

test("import: a period ending at year 0 keeps its end", () => {
  const { events } = parseImportFile(JSON.stringify([{ title: "x", year: 10, isBce: true, endYear: 0, endIsBce: false }]));
  assert.equal(events[0].endYear, 0);
});

test("import: bad rows are reported and skipped, not silently changed", () => {
  const { events, rowErrors } = parseImportFile(JSON.stringify([
    { title: "ok", year: 1 },
    { title: "bad month", year: 1, month: 13 },
    { title: "bad day", year: 44, isBce: true, month: 2, day: 31 },
    { title: "no year" },
    "not an object",
  ]));
  assert.equal(events.length, 1);
  assert.equal(rowErrors.length, 4);
  assert.match(rowErrors[0], /^Row 2: /);
  assert.match(rowErrors[1], /^Row 3: .*28 days/);
});

test("import: missing titles get a numbered default", () => {
  const { events } = parseImportFile(JSON.stringify([{ year: 1 }]));
  assert.equal(events[0].title, "Milestone 1");
});

test("import: old tagged descriptions are cleaned", () => {
  const { events } = parseImportFile(JSON.stringify([{ title: "x", year: 1, description: "<!--layer:Rome-->Notes" }]));
  assert.equal(events[0].notes, "Notes");
  assert.equal(events[0].layerName, "Rome");
});

test("import: whole-file problems throw a friendly error", () => {
  assert.throws(() => parseImportFile("{"), ImportFileError);
  assert.throws(() => parseImportFile("{}"), /events/);
  assert.throws(() => parseImportFile("[]"), /no events/);
});
