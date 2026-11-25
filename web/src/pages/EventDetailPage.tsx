import { useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { api, ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useAsync } from '../lib/useAsync';
import { closedReasonLabel, formatInZone, formatLocal, formatTime, viewerTimeZone } from '../lib/format';
import type { EventItem } from '../lib/types';
import { CapacityMeter, StatusBadge } from '../components/Badges';
import { EventPhoto } from '../components/EventPhoto';
import { Icon } from '../components/Icon';
import { EmptyState, ErrorState, Loading } from '../components/States';
import { useToast } from '../components/Toast';

interface DetailResponse {
  event: EventItem;
  myRegistration: { id: string; registeredAt: string } | null;
  isOwner: boolean;
}

export function EventDetailPage() {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const location = useLocation();
  const [busy, setBusy] = useState(false);
  const { data, error, loading, reload } = useAsync(() => api<DetailResponse>(`/events/${id}`), [id, user?.id]);

  if (loading && !data) return <Loading />;
  if (error) {
    return error instanceof ApiError && error.status === 404 ? (
      <EmptyState title="Event not found" icon="search">
        <p className="muted">It may have been removed or isn’t published yet.</p>
        <Link to="/" className="btn btn-secondary">
          Browse events
        </Link>
      </EmptyState>
    ) : (
      <ErrorState error={error} onRetry={reload} />
    );
  }
  if (!data) return null;
  const { event, myRegistration, isOwner } = data;

  async function register() {
    setBusy(true);
    try {
      const r = await api<{ message: string }>(`/events/${id}/registrations`, { method: 'POST' });
      toast('success', r.message);
    } catch (e) {
      toast('error', (e as Error).message);
    } finally {
      setBusy(false);
      reload(); // places may have changed even if we failed
    }
  }

  async function cancel() {
    if (!myRegistration || !confirm('Cancel your registration? Your spot will be released to others.')) return;
    setBusy(true);
    try {
      const r = await api<{ message: string }>(`/me/registrations/${myRegistration.id}/cancel`, { method: 'POST' });
      toast('success', r.message);
    } catch (e) {
      toast('error', (e as Error).message);
    } finally {
      setBusy(false);
      reload();
    }
  }

  const showLocal = viewerTimeZone() !== event.timezone;

  return (
    <div className="detail">
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link to="/">Events</Link>
        <span aria-hidden>/</span>
        <span className="truncate">{event.title}</span>
      </nav>

      {event.status === 'CANCELED' && (
        <div className="notice notice-danger">
          <Icon name="alert" /> This event has been canceled by the organizer.
        </div>
      )}
      {event.status === 'DRAFT' && (
        <div className="notice notice-warn">
          <Icon name="lock" /> Draft: only you can see this page until it’s published.
        </div>
      )}

      <EventPhoto event={event} width={1600} className="detail-photo" priority />

      <div className="detail-layout">
        <article className="detail-main">
          <p className="event-date">{formatInZone(event.startsAt, event.timezone, { year: undefined, timeZoneName: undefined })}</p>
          <h1>{event.title}</h1>
          <p className="host">
            Hosted by <strong>{event.organizer.name}</strong>
            {event.status !== 'PUBLISHED' && <StatusBadge status={event.status} />}
          </p>

          <ul className="info-list info-list-lg">
            <li>
              <Icon name="calendar" size={18} />
              <div>
                <strong>
                  {formatInZone(event.startsAt, event.timezone, { timeZoneName: undefined })}
                  {event.endsAt && <> – {formatTime(event.endsAt, event.timezone)}</>}
                </strong>
                <span>
                  {event.timezone.replace(/_/g, ' ')} time
                  {showLocal && <> · {formatLocal(event.startsAt)} your time</>}
                </span>
              </div>
            </li>
            <li>
              <Icon name="pin" size={18} />
              <div>
                <strong>{event.venue}</strong>
              </div>
            </li>
            <li>
              <Icon name="users" size={18} />
              <div>
                <strong>{event.activeRegistrations} going</strong>
                <span>Capacity {event.capacity}</span>
              </div>
            </li>
          </ul>

          <h2 className="h-section">About</h2>
          <p className="description">{event.description}</p>
        </article>

        <aside className="register-card">
          <div className="register-row">
            <span className="register-price">Free</span>
            <span className="muted small">
              {event.placesRemaining} of {event.capacity} {event.capacity === 1 ? 'spot' : 'spots'} left
            </span>
          </div>
          <CapacityMeter event={event} />

          <div className="register-actions">
            {myRegistration ? (
              <>
                <div className="notice notice-success">
                  <Icon name="check" /> You’re going
                </div>
                {event.closedReason !== 'STARTED' && (
                  <button className="btn btn-secondary btn-block" onClick={cancel} disabled={busy}>
                    {busy ? 'Canceling…' : 'Cancel registration'}
                  </button>
                )}
              </>
            ) : !event.registrationOpen ? (
              <div className="closed">{closedReasonLabel[event.closedReason ?? '']}</div>
            ) : !user ? (
              <Link to="/login" state={{ from: location.pathname }} className="btn btn-primary btn-block btn-lg">
                Log in to register
              </Link>
            ) : user.role === 'ATTENDEE' ? (
              <button className="btn btn-primary btn-block btn-lg" onClick={register} disabled={busy}>
                {busy ? 'Registering…' : 'Register'}
              </button>
            ) : isOwner ? null : (
              <p className="muted small">Log in with an attendee account to register.</p>
            )}

            {isOwner && (
              <>
                {event.status !== 'CANCELED' && (
                  <Link to={`/organizer/events/${event.id}/edit`} className="btn btn-secondary btn-block">
                    Edit event
                  </Link>
                )}
                <Link to={`/organizer/events/${event.id}/attendees`} className="btn btn-ghost btn-block">
                  View attendees
                </Link>
              </>
            )}
          </div>
          <p className="register-note">Registration closes when the event starts.</p>
        </aside>
      </div>
    </div>
  );
}
