import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { eventPhoto } from '../lib/photos';
import type { EventItem } from '../lib/types';
import { availabilityText, shortDate } from './EventCard';
import { Icon } from './Icon';
import { CountUp, RotatingWord } from './Motion';

const WORDS = ['meetup', 'workshop', 'concert', 'supper club', 'summit', 'night out'];

export function cityOf(venue: string) {
  if (/online/i.test(venue)) return null;
  return venue.split(',').pop()!.trim();
}

/**
 * Full-width hero: a slideshow of real upcoming events (crossfade + slow zoom).
 * Each slide's progress bar drives the timer: when its CSS animation ends we advance,
 * so hovering (which pauses the animation) also pauses the slideshow.
 */
export function Hero({ events, query, onQuery }: { events: EventItem[]; query: string; onQuery: (q: string) => void }) {
  const slides = events.filter((e) => e.registrationOpen).slice(0, 5);
  const [index, setIndex] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);
  const current = slides[index % Math.max(slides.length, 1)];

  const going = events.reduce((n, e) => n + e.activeRegistrations, 0);
  const seats = events.reduce((n, e) => n + e.placesRemaining, 0);
  const cities = new Set(events.map((e) => cityOf(e.venue)).filter(Boolean)).size;

  // "/" focuses search, like many real products.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <section className="hero" aria-label="Featured events">
      <div className="hero-slides" aria-hidden>
        {slides.map((e, i) => (
          <img
            key={e.id}
            src={eventPhoto(e, 1920)}
            alt=""
            className={`hero-slide ${i === index ? 'is-active' : ''}`}
            loading={i === 0 ? 'eager' : 'lazy'}
          />
        ))}
      </div>
      <div className="hero-overlay" />

      <div className="container hero-inner">
        <div className="hero-copy">
          <p className="hero-kicker">
            <strong>
              <CountUp value={going} />
            </strong>{' '}
            people are going to events on Gather
          </p>
          <h1>
            Find your next <RotatingWord words={WORDS} />
          </h1>
          <p className="hero-sub">Meetups, workshops and nights out in cities around the world. Free to join, seats are limited.</p>

          <label className="hero-search">
            <Icon name="search" size={18} />
            <input
              ref={searchRef}
              type="search"
              placeholder="Search events, venues or cities"
              value={query}
              onChange={(e) => onQuery(e.target.value)}
              aria-label="Search events"
            />
            <kbd>/</kbd>
          </label>

          <dl className="hero-stats">
            <div>
              <dt>Upcoming events</dt>
              <dd>
                <CountUp value={events.length} />
              </dd>
            </div>
            <div>
              <dt>Seats open</dt>
              <dd>
                <CountUp value={seats} />
              </dd>
            </div>
            <div>
              <dt>Cities</dt>
              <dd>
                <CountUp value={cities} />
              </dd>
            </div>
          </dl>
        </div>

        {current && (
          <div className="hero-now">
            <Link to={`/events/${current.id}`} className="hero-now-card" key={current.id}>
              <span className="hero-now-label">Happening soon</span>
              <strong>{current.title}</strong>
              <span className="hero-now-meta">
                {shortDate(current)} · {availabilityText(current).text}
              </span>
              <span className="hero-now-cta">
                View event <Icon name="arrowRight" size={14} />
              </span>
            </Link>
            <div className="hero-progress" role="tablist" aria-label="Featured event">
              {slides.map((e, i) => (
                <button
                  key={e.id}
                  role="tab"
                  aria-selected={i === index}
                  aria-label={e.title}
                  className={i === index ? 'is-active' : i < index ? 'is-done' : ''}
                  onClick={() => setIndex(i)}
                >
                  <i key={`${e.id}-${index}`} onAnimationEnd={() => setIndex((n) => (n + 1) % slides.length)} />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

/** Endless scrolling strip of the cities that have events. Pauses on hover. */
export function CityTicker({ cities }: { cities: string[] }) {
  if (cities.length === 0) return null;
  const items = [...cities, 'Online'];
  return (
    <div className="ticker" aria-hidden>
      <div className="ticker-track">
        {[0, 1].map((copy) => (
          <div className="ticker-group" key={copy}>
            {items.map((c) => (
              <span key={c}>
                <Icon name="pin" size={14} />
                {c}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
