import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, ApiError } from '../lib/api';
import { useAsync } from '../lib/useAsync';
import { formatDateTime, formatInZone } from '../lib/format';
import type { Attendee, EventItem } from '../lib/types';
import { CapacityMeter, StatusBadge } from '../components/Badges';
import { EmptyState, ErrorState, Loading } from '../components/States';

export function AttendeesPage() {
  const { id = '' } = useParams();
  const [showCanceled, setShowCanceled] = useState(false);
  const { data, error, loading, reload } = useAsync(
    () =>
      Promise.all([
        api<{ event: EventItem }>(`/events/${id}`),
        api<{ attendees: Attendee[] }>(`/organizer/events/${id}/attendees`),
      ]),
    [id],
  );

  if (loading && !data) return <Loading />;
  if (error) {
    if (error instanceof ApiError && (error.status === 403 || error.status === 404)) {
      return (
        <EmptyState title={error.status === 403 ? 'You can only view attendees for your own events' : 'Event not found'} icon="lock">
          <Link to="/organizer" className="btn btn-secondary">
            Back to dashboard
          </Link>
        </EmptyState>
      );
    }
    return <ErrorState error={error} onRetry={reload} />;
  }
  if (!data) return null;
  const [{ event }, { attendees }] = data;
  const active = attendees.filter((a) => a.status === 'ACTIVE');
  const rows = showCanceled ? attendees : active;

  return (
    <>
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link to="/organizer">Dashboard</Link>
        <span aria-hidden>/</span>
        <span>Attendees</span>
      </nav>
      <div className="page-head">
        <div>
          <h1>{event.title}</h1>
          <p className="muted">
            {formatInZone(event.startsAt, event.timezone)} · <StatusBadge status={event.status} />
          </p>
        </div>
        <div className="head-meter">
          <CapacityMeter event={event} />
        </div>
      </div>

      <div className="row between">
        <h2 className="h-section">Attendees ({active.length})</h2>
        <label className="small row gap-sm">
          <input type="checkbox" checked={showCanceled} onChange={(e) => setShowCanceled(e.target.checked)} />
          Show canceled ({attendees.length - active.length})
        </label>
      </div>

      {rows.length === 0 ? (
        <EmptyState title="No registrations yet" icon="users">
          <p className="muted">Attendees will appear here as they register.</p>
        </EmptyState>
      ) : (
        <div className="card table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Registered at</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id} className={a.status === 'CANCELED' ? 'dim' : ''}>
                  <td className="strong">{a.attendee.name}</td>
                  <td>
                    <a href={`mailto:${a.attendee.email}`}>{a.attendee.email}</a>
                  </td>
                  <td>{formatDateTime(a.registeredAt)}</td>
                  <td>
                    {a.status === 'ACTIVE' ? (
                      <span className="badge badge-active">Active</span>
                    ) : (
                      <span className="badge badge-canceled">Canceled {a.canceledAt && formatDateTime(a.canceledAt)}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
