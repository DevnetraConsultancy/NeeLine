import { test } from "node:test";
import assert from "node:assert/strict";
import {
  compareDates, dateValue, daysInMonth, formatDateLabel, formatGap, formatSpanLabel,
  formatYearNumber, isLeapYear, validateDate, yearsBetween, type HistoricalDate,
} from "../../src/lib/domain/dates";

const d = (year: number, isBce = false, month: number | null = null, day: number | null = null): HistoricalDate =>
  ({ year, isBce, month, day });

test("dates: year counts skip the missing year 0 when crossing eras", () => {
  assert.equal(yearsBetween(-10, 10), 19);
  assert.equal(yearsBetween(10, -10), 19);
  assert.equal(yearsBetween(-1, 1), 1);
  assert.equal(yearsBetween(-500, -300), 200);
  assert.equal(yearsBetween(1900, 2000), 100);
  assert.equal(yearsBetween(0, 10), 10, "the axis 0 point is not an era crossing");
});

test("dates: span label and gap badge agree", () => {
  assert.match(formatSpanLabel(d(10, true), d(10)), /\(19 yrs\)$/);
  assert.equal(formatSpanLabel(d(500, true), d(300, true)), "500 – 300 BCE (200 yrs)");
  assert.equal(formatSpanLabel(d(1), d(2)), "1 – 2 CE (1 yr)");
});

test("dates: span label orders reversed input", () => {
  assert.equal(formatSpanLabel(d(300, true), d(500, true)), "500 – 300 BCE (200 yrs)");
});

test("dates: years under 10,000 have no separator, regardless of locale", () => {
  assert.equal(formatYearNumber(1947), "1947");
  assert.equal(formatYearNumber(9999), "9999");
  assert.equal(formatYearNumber(10000), "10,000");
  assert.equal(formatYearNumber(13_800_000), "13,800,000");
  assert.equal(formatDateLabel(d(1947, false, 8, 15)), "Aug 15, 1947 CE");
  assert.equal(formatDateLabel(d(44, true, 3)), "Mar 44 BCE");
  assert.equal(formatDateLabel(d(0)), "0");
});

test("dates: gap badge formatting", () => {
  assert.equal(formatGap(1), "1 yr");
  assert.equal(formatGap(950), "950 yrs");
  assert.equal(formatGap(1000), "1k yrs");
  assert.equal(formatGap(1500), "1.5k yrs");
  assert.equal(formatGap(2_000_000), "2M yrs");
});

test("dates: leap years use astronomical numbering for BCE", () => {
  assert.equal(isLeapYear(2000, false), true);
  assert.equal(isLeapYear(1900, false), false);
  assert.equal(isLeapYear(1, true), true, "1 BCE is astronomical year 0");
  assert.equal(isLeapYear(5, true), true, "5 BCE is astronomical year -4");
  assert.equal(isLeapYear(44, true), false);
  assert.equal(daysInMonth(2024, false, 2), 29);
  assert.equal(daysInMonth(2023, false, 4), 30);
});

test("dates: validation rejects impossible dates with a clear message", () => {
  assert.equal(validateDate(d(1947, false, 8, 15)), null);
  assert.match(validateDate(d(44, true, 2, 31)) ?? "", /Feb has 28 days/);
  assert.match(validateDate(d(2000, false, 13)) ?? "", /between 1 and 12/);
  assert.match(validateDate(d(2000, false, null, 5)) ?? "", /choose a month/);
  assert.match(validateDate(d(3_000_000_000)) ?? "", /supported/);
  assert.match(validateDate(d(1.5)) ?? "", /whole number/);
});

test("dates: month and day move a date within its year", () => {
  assert.equal(dateValue(d(1947)), 1947);
  assert.ok(dateValue(d(1947, false, 1)) < dateValue(d(1947, false, 12)));
  assert.ok(dateValue(d(1947, false, 12, 31)) < 1948);
  assert.ok(dateValue(d(44, true, 3, 15)) > -44 && dateValue(d(44, true, 3, 15)) < -43);
  assert.ok(compareDates(d(44, true), d(43, true)) < 0);
});
