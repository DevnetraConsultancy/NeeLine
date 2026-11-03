import { test } from "node:test";
import assert from "node:assert/strict";
import { eventCreateSchema, firstIssue, layerDeleteSchema, timelineUpdateSchema } from "../../src/lib/validation/schemas";
import { eventIdentityKey } from "../../src/lib/domain/events";

const base = {
  timelineId: "t1", title: "Caesar", notes: null, year: 44, isBce: true, month: 3, day: 15,
  endYear: null, endIsBce: null, endMonth: null, endDay: null, color: "#C9A84C", layerId: "L1",
};

test("schemas: a valid event passes and colours are normalised", () => {
  const parsed = eventCreateSchema.parse(base);
  assert.equal(parsed.color, "#c9a84c");
});

test("schemas: impossible dates, reversed periods and long text are rejected", () => {
  const bad = (over: object) => {
    const r = eventCreateSchema.safeParse({ ...base, ...over });
    assert.equal(r.success, false);
    return r.success ? "" : firstIssue(r.error);
  };
  assert.match(bad({ day: 31, month: 2 }), /28 days/);
  assert.match(bad({ endYear: 50, endIsBce: true }), /end on or after/);
  assert.match(bad({ title: "x".repeat(201) }), /at most 200/);
  assert.match(bad({ title: "   " }), /required/);
  assert.match(bad({ color: "red" }), /#a1b2c3/);
  assert.match(bad({ color: "#fff; background:url(x)" }), /#a1b2c3/);
  assert.match(bad({ year: 3_000_000_000 }), /supported/);
});

test("schemas: a period ending at year 0 is valid", () => {
  assert.equal(eventCreateSchema.safeParse({ ...base, month: null, day: null, year: 10, endYear: 0, endIsBce: false }).success, true);
});

test("schemas: timeline updates cannot set arbitrary fields such as deletedAt", () => {
  assert.equal(timelineUpdateSchema.safeParse({ deletedAt: "2020-01-01" }).success, false);
  assert.equal(timelineUpdateSchema.safeParse({ bgColor: null }).success, true);
});

test("schemas: deleting a layer requires an explicit choice", () => {
  assert.equal(layerDeleteSchema.safeParse({}).success, false);
  assert.equal(layerDeleteSchema.safeParse({ mode: "move-to-default" }).success, true);
});

test("events: identity ignores case, spacing and colour but not layer", () => {
  const e = { title: " Caesar ", notes: "Ides", year: 44, isBce: true, month: 3, day: 15, endYear: null, endIsBce: null, endMonth: null, endDay: null };
  assert.equal(eventIdentityKey(e, "rome"), eventIdentityKey({ ...e, title: "caesar", notes: "IDES " }, "rome"));
  assert.notEqual(eventIdentityKey(e, "rome"), eventIdentityKey(e, "general"));
});
