import type { EventItem, EventStatus } from '../lib/types';

export function StatusBadge({ status }: { status: EventStatus | 'ACTIVE' }) {
  const label = { DRAFT: 'Draft', PUBLISHED: 'Published', CANCELED: 'Canceled', ACTIVE: 'Registered' }[status];
  return <span className={`badge badge-${status.toLowerCase()}`}>{label}</span>;
}

export function CapacityMeter({ event }: { event: EventItem }) {
  const pct = Math.min(100, Math.round((event.activeRegistrations / event.capacity) * 100));
  const tone = event.placesRemaining === 0 ? 'full' : pct >= 80 ? 'low' : 'ok';
  return (
    <div className="meter" aria-label={`${event.activeRegistrations} of ${event.capacity} places taken`}>
      <div className="meter-track">
        <div className={`meter-fill meter-${tone}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="meter-label">
        {event.activeRegistrations} registered · {event.placesRemaining === 0 ? 'full' : `${event.placesRemaining} left`}
      </div>
    </div>
  );
}
