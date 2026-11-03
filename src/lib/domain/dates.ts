/**
 * Historical dates. A year is stored as a positive number plus an era flag
 * (isBce). The timeline axis keeps a 0 point between 1 BCE and 1 CE, so the
 * signed axis value of 44 BCE is -44. Year counts skip the missing year 0:
 * 10 BCE to 10 CE is 19 years.
 */

export const MAX_YEAR = 2_147_483_647; // Postgres INTEGER
export const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

export interface HistoricalDate {
  year: number;
  isBce: boolean;
  month: number | null;
  day: number | null;
}

export function signedYear(year: number, isBce: boolean): number {
  return isBce ? -Math.abs(year) : Math.abs(year);
}

/** Proleptic Gregorian leap-year rule on astronomical years (1 BCE = year 0). */
export function isLeapYear(year: number, isBce: boolean): boolean {
  const astronomical = isBce ? 1 - Math.abs(year) : Math.abs(year);
  return (astronomical % 4 === 0 && astronomical % 100 !== 0) || astronomical % 400 === 0;
}

export function daysInMonth(year: number, isBce: boolean, month: number): number {
  if (month === 2) return isLeapYear(year, isBce) ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

/** Returns a user-facing problem with the date, or null when it is valid. */
export function validateDate(date: HistoricalDate, label = "Date"): string | null {
  const { year, isBce, month, day } = date;
  if (!Number.isInteger(year) || year < 0) return `${label}: the year must be a whole number.`;
  if (year > MAX_YEAR) return `${label}: years up to ${MAX_YEAR.toLocaleString("en-US")} are supported.`;
  if (month !== null && (!Number.isInteger(month) || month < 1 || month > 12)) {
    return `${label}: the month must be between 1 and 12.`;
  }
  if (day !== null) {
    if (month === null) return `${label}: choose a month before choosing a day.`;
    const max = daysInMonth(year, isBce, month);
    if (!Number.isInteger(day) || day < 1 || day > max) {
      return `${label}: ${MONTH_NAMES[month - 1]} has ${max} days in that year.`;
    }
  }
  return null;
}

function dayOfYear(date: HistoricalDate): number {
  if (date.month === null) return 0;
  let days = 0;
  for (let m = 1; m < date.month; m++) days += daysInMonth(date.year, date.isBce, m);
  return days + (date.day ?? 1) - 1;
}

/**
 * Position of a date on the signed axis. A year without a month sits exactly
 * on its year; months and days move it forward through that year.
 */
export function dateValue(date: HistoricalDate): number {
  const daysInYear = isLeapYear(date.year, date.isBce) ? 366 : 365;
  return signedYear(date.year, date.isBce) + dayOfYear(date) / daysInYear;
}

export function compareDates(a: HistoricalDate, b: HistoricalDate): number {
  return dateValue(a) - dateValue(b);
}

/**
 * Whole calendar years between two signed years, skipping the year 0 that
 * does not exist in the calendar when the range crosses from BCE to CE.
 */
export function yearsBetween(fromSigned: number, toSigned: number): number {
  const early = Math.min(fromSigned, toSigned);
  const late = Math.max(fromSigned, toSigned);
  const diff = late - early;
  return early < 0 && late > 0 ? Math.max(1, diff - 1) : diff;
}

/** 1947 stays "1947"; separators only from 10,000 up. Locale-independent. */
export function formatYearNumber(year: number): string {
  const abs = Math.abs(year);
  return abs < 10_000 ? String(abs) : abs.toLocaleString("en-US");
}

export function formatDateLabel(date: HistoricalDate): string {
  if (!Number.isFinite(date.year)) return "Unknown";
  if (date.year === 0 && date.month === null) return "0";
  const era = date.isBce ? "BCE" : "CE";
  const year = `${formatYearNumber(date.year)} ${era}`;
  if (date.month === null || date.month < 1 || date.month > 12) return year;
  const month = MONTH_NAMES[date.month - 1];
  return date.day ? `${month} ${date.day}, ${year}` : `${month} ${year}`;
}

export function formatYearCount(years: number): string {
  return years === 1 ? "1 yr" : `${formatYearNumber(years)} yrs`;
}

/** Compact count for gap badges: 950 yrs, 1.5k yrs, 2M yrs. */
export function formatGap(years: number): string {
  const compact = (value: number, unit: string) =>
    `${Number.isInteger(value) ? value : value.toFixed(1)}${unit} yrs`;
  if (years >= 1_000_000) return compact(Math.round(years / 100_000) / 10, "M");
  if (years >= 1_000) return compact(Math.round(years / 100) / 10, "k");
  return formatYearCount(years);
}

export function formatSpanLabel(start: HistoricalDate, end: HistoricalDate): string {
  const [early, late] = compareDates(start, end) <= 0 ? [start, end] : [end, start];
  const count = formatYearCount(
    yearsBetween(signedYear(early.year, early.isBce), signedYear(late.year, late.isBce)),
  );
  const sameEra = early.isBce === late.isBce && early.year !== 0 && late.year !== 0;
  if (sameEra && early.month === null && late.month === null) {
    return `${formatYearNumber(early.year)} – ${formatYearNumber(late.year)} ${late.isBce ? "BCE" : "CE"} (${count})`;
  }
  return `${formatDateLabel(early)} – ${formatDateLabel(late)} (${count})`;
}
