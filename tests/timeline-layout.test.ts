import { test } from "node:test";
import assert from "node:assert/strict";
import {
  formatDateLabel,
  formatSpanLabel,
  layoutLabels,
  measureTextWidth,
} from "../src/lib/timeline-layout";

test("timeline-layout: formatDateLabel", () => {
  // Year zero permanent invariant
  assert.equal(formatDateLabel(0, false), "0");
  assert.equal(formatDateLabel(0, true), "0");

  // BCE years
  assert.equal(formatDateLabel(44, true), "44 BCE");

  // CE years
  assert.equal(formatDateLabel(2026, false), "2,026 CE");

  // Date with month and day
  assert.equal(formatDateLabel(1947, false, 8, 15), "Aug 15, 1,947 CE");

  // Date with month only
  assert.equal(formatDateLabel(1947, false, 8), "Aug 1,947 CE");

  // Fallback for invalid year
  assert.equal(formatDateLabel(NaN, false), "Unknown");
});

test("timeline-layout: formatSpanLabel", () => {
  // Same era BCE
  const bceSpan = formatSpanLabel(500, true, 300, true);
  assert.ok(bceSpan.includes("BCE"));
  assert.ok(bceSpan.includes("200 yrs"));

  // Cross-era (BCE to CE)
  const crossEraSpan = formatSpanLabel(10, true, 10, false);
  assert.ok(crossEraSpan.includes("10 BCE – 10 CE"));
  assert.ok(crossEraSpan.includes("19 yrs"));
});

test("timeline-layout: measureTextWidth SSR fallback", () => {
  const width = measureTextWidth("Sample Milestone");
  assert.ok(width > 0);
  assert.equal(width, "Sample Milestone".length * 7);
});

test("timeline-layout: layoutLabels point milestones and span tiers", () => {
  const mockEvents = [
    {
      id: "ev-1",
      year: 100,
      isBce: false,
      month: null,
      day: null,
      title: "Event One",
      description: null,
      color: "#c9a84c",
    },
    {
      id: "ev-2",
      year: 101, // Close in year, causing overlap
      isBce: false,
      month: null,
      day: null,
      title: "Event Two",
      description: null,
      color: "#5a9bd5",
    },
    {
      id: "ev-3",
      year: 50,
      isBce: false,
      month: null,
      day: null,
      title: "Pax Romana Span",
      description: null,
      color: "#10b981",
      endYear: 200,
      endIsBce: false,
    },
  ];

  const yearToX = (year: number) => year * 10;
  const layout = layoutLabels(mockEvents, yearToX);

  assert.equal(layout.length, 3);

  // Two close point events should be on different tiers to avoid collision
  const ev1 = layout.find((i) => i.eventId === "ev-1");
  const ev2 = layout.find((i) => i.eventId === "ev-2");
  const span = layout.find((i) => i.eventId === "ev-3");

  assert.ok(ev1 && ev2 && span);
  assert.ok(span.isSpan);
  assert.notEqual(ev1.tier, ev2.tier);
});
