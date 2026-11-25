import { DateTime, IANAZone } from 'luxon';

export const isValidTimeZone = (tz: string) => IANAZone.isValidZone(tz);

/**
 * Convert a wall-clock time in a given IANA zone ("2026-12-01T18:30" in "Asia/Kolkata")
 * into an absolute JS Date (UTC instant). Returns null if the input can't be parsed.
 */
export function localToInstant(local: string, timeZone: string): Date | null {
  const dt = DateTime.fromISO(local, { zone: timeZone });
  return dt.isValid ? dt.toJSDate() : null;
}

/** Inverse of localToInstant: format an instant as "YYYY-MM-DDTHH:mm" wall time in a zone. */
export function instantToLocal(date: Date, timeZone: string): string {
  return DateTime.fromJSDate(date, { zone: timeZone }).toFormat("yyyy-LL-dd'T'HH:mm");
}
