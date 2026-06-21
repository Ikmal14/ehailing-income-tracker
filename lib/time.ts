/**
 * Malaysia-time (UTC+8, no DST) helpers for form inputs.
 *
 * The native <input type="datetime-local"> / type="date" controls work with a
 * bare wall-clock string (no timezone). We always want that wall-clock to mean
 * Malaysia time, no matter what timezone the user's device is set to, and the
 * server must interpret it the same way. These helpers keep both ends aligned.
 */

const MYT_TZ = "Asia/Kuala_Lumpur";

/** Current Malaysia time as a "YYYY-MM-DDTHH:MM" value for datetime-local. */
export function mytNowDatetimeLocal(): string {
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone: MYT_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const g = (t: string) => p.find((x) => x.type === t)?.value ?? "00";
  return `${g("year")}-${g("month")}-${g("day")}T${g("hour")}:${g("minute")}`;
}

/** Today's date in Malaysia time as a "YYYY-MM-DD" value for date inputs. */
export function mytToday(): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: MYT_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/**
 * Convert a wall-clock value the user picked (interpreted as Malaysia time) into
 * a UTC ISO string for storage. Accepts "YYYY-MM-DD", "YYYY-MM-DDTHH:MM", or a
 * value that already carries seconds. Falls back to "now" for empty input.
 */
export function mytLocalToIso(local: string): string {
  if (!local) return new Date().toISOString();
  let s = local.trim();
  if (s.length === 10) s = `${s}T00:00`; // date-only -> midnight MYT
  if (s.length === 16) s = `${s}:00`; // add seconds
  const d = new Date(`${s}+08:00`);
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}
