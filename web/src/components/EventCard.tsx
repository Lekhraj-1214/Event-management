import { Link } from 'react-router-dom';
import { formatInZone } from '../lib/format';
import type { EventItem } from '../lib/types';
import { EventPhoto } from './EventPhoto';
import { Icon } from './Icon';

export function availabilityText(event: EventItem) {
  if (event.placesRemaining === 0) return { text: 'Sold out', tone: 'danger' as const };
  if (event.placesRemaining <= Math.max(3, Math.ceil(event.capacity * 0.15)))
    return { text: `${event.placesRemaining} ${event.placesRemaining === 1 ? 'spot' : 'spots'} left`, tone: 'warn' as const };
  return { text: `${event.placesRemaining} spots left`, tone: 'ok' as const };
}

export function shortDate(event: EventItem) {
  return formatInZone(event.startsAt, event.timezone, { year: undefined });
}

export function EventCard({ event }: { event: EventItem }) {
  const availability = availabilityText(event);
  return (
    <Link to={`/events/${event.id}`} className="event-card">
      <div className="event-card-media">
        <EventPhoto event={event} width={640} />
        {availability.tone !== 'ok' && (
          <span className={`tag tag-${availability.tone}`}>
            {availability.text}
          </span>
        )}
      </div>
      <div className="event-card-body">
        <p className="event-date">{shortDate(event)}</p>
        <h3>{event.title}</h3>
        <p className="event-venue">
          <Icon name="pin" size={14} />
          <span className="truncate">{event.venue}</span>
        </p>
        <p className={`event-spots spots-${availability.tone}`}>
          {availability.tone === 'ok' ? `${event.placesRemaining} of ${event.capacity} spots left` : availability.text}
        </p>
      </div>
    </Link>
  );
}
