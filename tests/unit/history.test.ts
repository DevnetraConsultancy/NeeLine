import { test } from "node:test";
import assert from "node:assert/strict";
import {
  afterRedo, afterUndo, discard, emptyHistory, forgetEvents, moveLayer, record, redoOperation,
  undoOperation, MAX_HISTORY, type HistoryAction,
} from "../../src/lib/domain/history";
import type { TimelineEvent } from "../../src/lib/domain/events";

const event = (id: string, over: Partial<TimelineEvent> = {}): TimelineEvent => ({
  id, timelineId: "t", layerId: "L1", year: 1, isBce: false, month: null, day: null,
  endYear: null, endIsBce: null, endMonth: null, endDay: null, title: id, notes: null, color: "#c9a84c", ...over,
});

test("history: undoing a delete restores the same events, redo deletes them again", () => {
  const action: HistoryAction = { kind: "delete", label: "Delete", events: [event("a")] };
  assert.deepEqual(undoOperation(action), { type: "restore-events", events: [event("a")] });
  assert.deepEqual(redoOperation(action), { type: "delete-events", ids: ["a"] });
});

test("history: update undo writes the before snapshot", () => {
  const op = undoOperation({ kind: "update", label: "Edit", before: event("a", { title: "old" }), after: event("a", { title: "new" }) });
  assert.equal(op.type, "update-event");
  assert.equal(op.type === "update-event" && op.fields.title, "old");
  assert.equal(op.type === "update-event" && "id" in op.fields, false);
});

test("history: stacks move only when told the server succeeded", () => {
  let h = record(emptyHistory, { kind: "rename", label: "Rename", before: "a", after: "b" });
  assert.equal(h.undo.length, 1);
  const action = h.undo[0];
  h = afterUndo(h, action);
  assert.deepEqual([h.undo.length, h.redo.length], [0, 1]);
  h = afterRedo(h, action);
  assert.deepEqual([h.undo.length, h.redo.length], [1, 0]);
  assert.equal(discard(h, action).undo.length, 0);
});

test("history: an undo that finishes after a newer change moves the right entry", () => {
  let h = record(emptyHistory, { kind: "rename", label: "first", before: "a", after: "b" });
  const undoing = h.undo[0];
  h = record(h, { kind: "rename", label: "second", before: "b", after: "c" });
  h = afterUndo(h, undoing);
  assert.deepEqual(h.undo.map((a) => a.label), ["second"]);
  assert.deepEqual(h.redo.map((a) => a.label), ["first"]);
});

test("history: recording clears redo and keeps at most 50 entries", () => {
  let h = emptyHistory;
  for (let i = 0; i < 60; i++) h = record(h, { kind: "rename", label: String(i), before: "", after: "" });
  assert.equal(h.undo.length, MAX_HISTORY);
  assert.equal(h.undo[0].label, "10");
  h = afterUndo(h, h.undo.at(-1)!);
  h = record(h, { kind: "rename", label: "new", before: "", after: "" });
  assert.equal(h.redo.length, 0);
});

test("history: forgetting events removes or trims every entry that used them", () => {
  let h = emptyHistory;
  h = record(h, { kind: "create", label: "Add", event: event("a") });
  h = record(h, { kind: "import", label: "Import", events: [event("a"), event("b")] });
  h = record(h, { kind: "update", label: "Edit", before: event("a"), after: event("a") });
  h = forgetEvents(h, new Set(["a"]));
  assert.equal(h.undo.length, 1);
  assert.deepEqual(h.undo[0].kind === "import" && h.undo[0].events.map((e) => e.id), ["b"]);
});

test("history: moving a layer rewrites snapshots", () => {
  const h = moveLayer(record(emptyHistory, { kind: "delete", label: "Delete", events: [event("a"), event("b", { layerId: "L2" })] }), "L1", "L0");
  assert.deepEqual(h.undo[0].kind === "delete" && h.undo[0].events.map((e) => e.layerId), ["L0", "L2"]);
});
