/**
 * "YYYY-MM-DD" for a Date, using LOCAL date parts.
 *
 * Don't use `date.toISOString().slice(0, 10)` for this: toISOString() converts
 * to UTC first, so in any timezone ahead of UTC a date shortly after local
 * midnight comes out as the previous day (and behind UTC, the next day late
 * in the evening).
 */
export function toLocalDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
