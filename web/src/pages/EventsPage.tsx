import { useMemo, useState } from 'react';
import { api } from '../lib/api';
import { useAsync } from '../lib/useAsync';
import type { EventItem } from '../lib/types';
import { EventCard } from '../components/EventCard';
import { CityTicker, Hero, cityOf } from '../components/Hero';
import { Reveal } from '../components/Motion';
import { EmptyState, ErrorState, SkeletonGrid } from '../components/States';

const CATEGORIES: { label: string; match?: RegExp }[] = [
  { label: 'All' },
  { label: 'Tech', match: /react|typescript|code|postgres|data|engineer|design system|hack|product/i },
  { label: 'Music', match: /jazz|blues|concert|music|dj/i },
  { label: 'Food & drink', match: /supper|dinner|breakfast|coffee|drinks|wine/i },
  { label: 'Workshops', match: /workshop|deep dive|hands-on/i },
  { label: 'Comedy & nightlife', match: /comedy|open mic|night/i },
  { label: 'Online', match: /online|zoom/i },
];

export function EventsPage() {
  const { data, error, loading, reload } = useAsync(() => api<{ events: EventItem[] }>('/events'), []);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');

  const all = data?.events ?? [];
  const cities = useMemo(() => [...new Set(all.map((e) => cityOf(e.venue)).filter((c): c is string => !!c))], [all]);

  const q = query.trim().toLowerCase();
  const matcher = CATEGORIES.find((c) => c.label === category)?.match;
  const events = all.filter((e) => {
    const searchable = `${e.title} ${e.venue} ${e.description}`.toLowerCase();
    // Categories look at title + venue only; descriptions mention "coffee breaks" etc. too often.
    return searchable.includes(q) && (!matcher || matcher.test(`${e.title} ${e.venue}`));
  });
  const filtered = q || category !== 'All';

  return (
    <>
      {data && all.length > 0 ? (
        <>
          <Hero events={all} query={query} onQuery={setQuery} />
          <CityTicker cities={cities} />
        </>
      ) : (
        <header className="page-header">
          <div>
            <h1>Upcoming events</h1>
            <p className="muted">Meetups, workshops and evenings out. Free to join, seats are limited.</p>
          </div>
        </header>
      )}

      <section className="section" id="events">
        <div className="section-title">
          <h2>{q ? `Results for “${query}”` : category === 'All' ? 'All upcoming events' : category}</h2>
          {data && <span className="muted small">{events.length} {events.length === 1 ? 'event' : 'events'}</span>}
        </div>

        {data && all.length > 0 && (
          <div className="chips" role="toolbar" aria-label="Filter by category">
            {CATEGORIES.map((c) => (
              <button
                key={c.label}
                className={`chip ${category === c.label ? 'is-active' : ''}`}
                aria-pressed={category === c.label}
                onClick={() => setCategory(c.label)}
              >
                {c.label}
              </button>
            ))}
          </div>
        )}

        {loading && !data ? (
          <SkeletonGrid />
        ) : error ? (
          <ErrorState error={error} onRetry={reload} />
        ) : events.length === 0 ? (
          <EmptyState icon={filtered ? 'search' : 'calendar'} title={filtered ? 'No events match your filters' : 'No upcoming events yet'}>
            <p className="muted">{filtered ? 'Try a different keyword or category.' : 'Check back soon.'}</p>
            {filtered && (
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setQuery('');
                  setCategory('All');
                }}
              >
                Clear filters
              </button>
            )}
          </EmptyState>
        ) : (
          <div className="grid">
            {events.map((e, i) => (
              <Reveal key={e.id} delay={(i % 4) * 80}>
                <EventCard event={e} />
              </Reveal>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
