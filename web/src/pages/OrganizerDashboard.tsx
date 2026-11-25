import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useAsync } from '../lib/useAsync';
import { formatInZone } from '../lib/format';
import type { EventItem } from '../lib/types';
import { StatusBadge } from '../components/Badges';
import { Icon } from '../components/Icon';
import { CountUp } from '../components/Motion';
import { EventPhoto } from '../components/EventPhoto';
import { EmptyState, ErrorState, Loading } from '../components/States';

export function OrganizerDashboard() {
  const { data, error, loading, reload } = useAsync(() => api<{ events: EventItem[] }>('/organizer/events'), []);

  const head = (
    <div className="page-head">
      <div>
        <h1>Your events</h1>
        <p className="muted">Track capacity and see who’s coming to each event.</p>
      </div>
      <Link to="/organizer/events/new" className="btn btn-primary">
        <Icon name="plus" /> New event
      </Link>
    </div>
  );

  if (loading && !data) return <>{head}<Loading /></>;
  if (error) return <>{head}<ErrorState error={error} onRetry={reload} /></>;
  const events = data?.events ?? [];

  const published = events.filter((e) => e.status === 'PUBLISHED');
  const totalRegs = events.reduce((n, e) => n + (e.status === 'CANCELED' ? 0 : e.activeRegistrations), 0);

  return (
    <>
      {head}
      {events.length === 0 ? (
        <EmptyState title="You haven't created any events yet">
          <Link to="/organizer/events/new" className="btn btn-primary">
            Create your first event
          </Link>
        </EmptyState>
      ) : (
        <>
          <div className="stats">
            <div className="card stat">
              <span className="stat-label">Events</span>
              <strong><CountUp value={events.length} /></strong>
            </div>
            <div className="card stat">
              <span className="stat-label">Published</span>
              <strong><CountUp value={published.length} /></strong>
            </div>
            <div className="card stat">
              <span className="stat-label">Active registrations</span>
              <strong><CountUp value={totalRegs} /></strong>
            </div>
          </div>
          <div className="card table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Status</th>
                  <th className="num">Capacity</th>
                  <th className="num">Registered</th>
                  <th className="num">Available</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {events.map((e) => (
                  <tr key={e.id} className={e.status === 'CANCELED' ? 'dim' : ''}>
                    <td>
                      <div className="row gap-sm nowrap">
                        <EventPhoto event={e} width={160} className="thumb" />
                        <div>
                          <Link to={`/events/${e.id}`} className="strong">
                            {e.title}
                          </Link>
                          <div className="muted small">{formatInZone(e.startsAt, e.timezone)}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <StatusBadge status={e.status} />
                      {e.closedReason === 'STARTED' && <span className="stat-label"> · past</span>}
                    </td>
                    <td className="num">{e.capacity}</td>
                    <td className="num">{e.activeRegistrations}</td>
                    <td className="num">
                      {e.status === 'CANCELED' ? (
                        <span className="muted">—</span>
                      ) : e.placesRemaining === 0 ? (
                        <span className="badge badge-full">Full</span>
                      ) : (
                        e.placesRemaining
                      )}
                    </td>
                    <td className="actions">
                      <Link to={`/organizer/events/${e.id}/attendees`} className="btn btn-ghost btn-sm">
                        Attendees
                      </Link>
                      {e.status !== 'CANCELED' && (
                        <Link to={`/organizer/events/${e.id}/edit`} className="btn btn-secondary btn-sm">
                          Edit
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
