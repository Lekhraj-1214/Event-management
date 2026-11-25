import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useAsync } from '../lib/useAsync';
import { formatDateTime, formatInZone } from '../lib/format';
import type { Registration } from '../lib/types';
import { EmptyState, ErrorState, Loading } from '../components/States';
import { useToast } from '../components/Toast';
import { EventPhoto } from '../components/EventPhoto';
import { Reveal } from '../components/Motion';

export function MyRegistrationsPage() {
  const toast = useToast();
  const [busyId, setBusyId] = useState<string | null>(null);
  const { data, error, loading, reload } = useAsync(() => api<{ registrations: Registration[] }>('/me/registrations'), []);

  if (loading && !data) return <Loading />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const now = Date.now();
  const all = data?.registrations ?? [];
  const upcoming = all
    .filter((r) => r.status === 'ACTIVE' && new Date(r.event.startsAt).getTime() > now)
    .sort((a, b) => a.event.startsAt.localeCompare(b.event.startsAt));
  const past = all.filter((r) => r.status === 'ACTIVE' && new Date(r.event.startsAt).getTime() <= now);
  const canceled = all.filter((r) => r.status === 'CANCELED');

  async function cancel(r: Registration) {
    if (!confirm(`Cancel your registration for “${r.event.title}”?`)) return;
    setBusyId(r.id);
    try {
      const res = await api<{ message: string }>(`/me/registrations/${r.id}/cancel`, { method: 'POST' });
      toast('success', res.message);
    } catch (e) {
      toast('error', (e as Error).message);
    } finally {
      setBusyId(null);
      reload();
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>My tickets</h1>
          <p className="muted">Your upcoming events and registration history.</p>
        </div>
      </div>

      <h2 className="h-section">Upcoming ({upcoming.length})</h2>
      {upcoming.length === 0 ? (
        <EmptyState title="You have no upcoming events" icon="ticket">
          <Link to="/" className="btn btn-primary">
            Browse events
          </Link>
        </EmptyState>
      ) : (
        <div className="list">
          {upcoming.map((r, i) => (
            <Reveal key={r.id} delay={i * 70}>
            <div className={`card reg-row ${r.event.status === 'CANCELED' ? 'is-event-canceled' : ''}`}>
              <EventPhoto event={r.event} width={240} className="thumb thumb-lg" />
              <div className="grow">
                <Link to={`/events/${r.event.id}`} className="reg-title">
                  {r.event.title}
                </Link>
                <p className="muted small">
                  {formatInZone(r.event.startsAt, r.event.timezone)} · {r.event.venue}
                </p>
                <p className="muted small">Registered {formatDateTime(r.registeredAt)}</p>
              </div>
              {r.event.status === 'CANCELED' ? (
                <span className="badge badge-canceled">Event canceled by organizer</span>
              ) : (
                <button className="btn btn-danger-outline btn-sm" disabled={busyId === r.id} onClick={() => cancel(r)}>
                  {busyId === r.id ? 'Canceling…' : 'Cancel'}
                </button>
              )}
            </div>
            </Reveal>
          ))}
        </div>
      )}

      {canceled.length > 0 && (
        <details className="history">
          <summary>Canceled registrations ({canceled.length})</summary>
          <div className="list">
            {canceled.map((r) => (
              <div key={r.id} className="card reg-row is-canceled">
                <div className="grow">
                  <Link to={`/events/${r.event.id}`} className="reg-title">
                    {r.event.title}
                  </Link>
                  <p className="muted small">{formatInZone(r.event.startsAt, r.event.timezone)}</p>
                </div>
                <span className="badge badge-canceled">You canceled {r.canceledAt && formatDateTime(r.canceledAt)}</span>
              </div>
            ))}
          </div>
        </details>
      )}

      {past.length > 0 && (
        <details className="history">
          <summary>Past events ({past.length})</summary>
          <div className="list">
            {past.map((r) => (
              <div key={r.id} className="card reg-row is-canceled">
                <div className="grow">
                  <span className="reg-title">{r.event.title}</span>
                  <p className="muted small">{formatInZone(r.event.startsAt, r.event.timezone)}</p>
                </div>
              </div>
            ))}
          </div>
        </details>
      )}
    </>
  );
}
