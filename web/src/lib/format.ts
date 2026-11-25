/** Format an instant in the event's own time zone, e.g. "Sat, 5 Dec 2026, 6:00 pm GMT+5:30". */
export function formatInZone(iso: string, timeZone: string, opts: Intl.DateTimeFormatOptions = {}) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone,
    timeZoneName: 'short',
    ...opts,
  }).format(new Date(iso));
}

export function formatTime(iso: string, timeZone: string) {
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit', timeZone, timeZoneName: 'short' }).format(
    new Date(iso),
  );
}

/** Same instant in the viewer's local zone (shown when it differs from the event zone). */
export function formatLocal(iso: string) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(new Date(iso));
}

export const viewerTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

export function dateParts(iso: string, timeZone: string) {
  const d = new Date(iso);
  return {
    month: new Intl.DateTimeFormat(undefined, { month: 'short', timeZone }).format(d),
    day: new Intl.DateTimeFormat(undefined, { day: 'numeric', timeZone }).format(d),
  };
}

export function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));
}

export const closedReasonLabel: Record<string, string> = {
  DRAFT: 'Not published',
  CANCELED: 'Event canceled',
  STARTED: 'Registration closed — event has started',
  FULL: 'Sold out',
};
