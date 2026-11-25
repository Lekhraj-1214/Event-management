import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, ApiError } from '../lib/api';
import { viewerTimeZone } from '../lib/format';
import type { EventItem, EventStatus } from '../lib/types';
import { ErrorState, Loading } from '../components/States';
import { useToast } from '../components/Toast';
import { EventPhoto } from '../components/EventPhoto';

interface FormState {
  title: string;
  description: string;
  startsLocal: string;
  endsLocal: string;
  timezone: string;
  venue: string;
  imageUrl: string;
  capacity: string;
  status: EventStatus;
}

const empty = (): FormState => ({
  title: '',
  description: '',
  startsLocal: '',
  endsLocal: '',
  timezone: viewerTimeZone(),
  venue: '',
  imageUrl: '',
  capacity: '50',
  status: 'DRAFT',
});

function allTimeZones(current: string) {
  const zones = new Set(Intl.supportedValuesOf('timeZone'));
  zones.add('UTC');
  zones.add(current);
  return [...zones].sort();
}

export function EventFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const toast = useToast();

  const [form, setForm] = useState<FormState>(empty);
  const [original, setOriginal] = useState<EventItem | null>(null);
  const [loadError, setLoadError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(isEdit);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!id) return;
    api<{ event: EventItem; isOwner: boolean }>(`/events/${id}`)
      .then(({ event, isOwner }) => {
        if (!isOwner) throw new Error('You can only edit your own events.');
        setOriginal(event);
        setForm({
          title: event.title,
          description: event.description,
          startsLocal: event.startsLocal,
          endsLocal: event.endsLocal ?? '',
          timezone: event.timezone,
          venue: event.venue,
          imageUrl: event.imageUrl ?? '',
          capacity: String(event.capacity),
          status: event.status,
        });
      })
      .catch(setLoadError)
      .finally(() => setLoading(false));
  }, [id]);

  const zones = useMemo(() => allTimeZones(form.timezone), [form.timezone]);
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));
  const minCapacity = Math.max(1, original?.activeRegistrations ?? 1);

  function validate(): Record<string, string> {
    const e: Record<string, string> = {};
    if (!form.title.trim()) e.title = 'Title is required';
    if (!form.description.trim()) e.description = 'Description is required';
    if (!form.venue.trim()) e.venue = 'Venue is required';
    if (form.imageUrl.trim() && !/^https:\/\/\S+$/.test(form.imageUrl.trim())) e.imageUrl = 'Use an https:// image link';
    if (!form.startsLocal) e.startsLocal = 'Start date and time are required';
    if (form.endsLocal && form.startsLocal && form.endsLocal <= form.startsLocal) e.endsLocal = 'End must be after start';
    const cap = Number(form.capacity);
    if (!Number.isInteger(cap) || cap < 1) e.capacity = 'Capacity must be a whole number of at least 1';
    else if (cap < minCapacity) e.capacity = `Capacity can't be below the ${minCapacity} active registrations`;
    return e;
  }

  async function save(e: FormEvent, statusOverride?: EventStatus) {
    e.preventDefault();
    setFormError('');
    const clientErrors = validate();
    setErrors(clientErrors);
    if (Object.keys(clientErrors).length) return;

    const body = {
      title: form.title,
      description: form.description,
      startsLocal: form.startsLocal,
      endsLocal: form.endsLocal || null,
      timezone: form.timezone,
      venue: form.venue,
      imageUrl: form.imageUrl.trim() || null,
      capacity: Number(form.capacity),
      status: statusOverride ?? form.status,
    };
    setBusy(true);
    try {
      const r = isEdit
        ? await api<{ event: EventItem }>(`/events/${id}`, { method: 'PATCH', body })
        : await api<{ event: EventItem }>('/events', { method: 'POST', body });
      toast('success', statusOverride === 'CANCELED' ? 'Event canceled.' : isEdit ? 'Event updated.' : 'Event created.');
      navigate(r.event.status === 'CANCELED' ? '/organizer' : `/events/${r.event.id}`);
    } catch (err) {
      const apiErr = err as ApiError;
      setErrors(Object.fromEntries((apiErr.fieldErrors ?? []).map((f) => [f.path, f.message])));
      setFormError(apiErr.message);
    } finally {
      setBusy(false);
    }
  }

  function cancelEvent(e: FormEvent) {
    const n = original?.activeRegistrations ?? 0;
    const msg = `Cancel “${form.title}”? ${n ? `${n} registered attendee(s) will see it as canceled. ` : ''}This can't be undone.`;
    if (confirm(msg)) void save(e, 'CANCELED');
  }

  if (loading) return <Loading />;
  if (loadError) return <ErrorState error={loadError} />;

  const field = (name: keyof FormState) => ({
    'aria-invalid': Boolean(errors[name]) || undefined,
    className: `input ${errors[name] ? 'input-error' : ''}`,
  });
  const err = (name: string) => errors[name] && <span className="field-error">{errors[name]}</span>;

  return (
    <div className="form-page">
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link to="/organizer">Dashboard</Link>
        <span aria-hidden>/</span>
        <span>{isEdit ? 'Edit event' : 'New event'}</span>
      </nav>
      <h1>{isEdit ? 'Edit event' : 'New event'}</h1>

      <form className="card form" onSubmit={save} noValidate>
        {formError && <div className="banner banner-error">{formError}</div>}

        <label>
          Title
          <input {...field('title')} value={form.title} onChange={(e) => set('title', e.target.value)} maxLength={200} />
          {err('title')}
        </label>

        <label>
          Description
          <textarea
            {...field('description')}
            rows={5}
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
          />
          {err('description')}
        </label>

        <div className="form-row">
          <label>
            Starts
            <input
              {...field('startsLocal')}
              type="datetime-local"
              value={form.startsLocal}
              onChange={(e) => set('startsLocal', e.target.value)}
            />
            {err('startsLocal')}
          </label>
          <label>
            <span>
              Ends <span className="muted">(optional)</span>
            </span>
            <input
              {...field('endsLocal')}
              type="datetime-local"
              value={form.endsLocal}
              min={form.startsLocal || undefined}
              onChange={(e) => set('endsLocal', e.target.value)}
            />
            {err('endsLocal')}
          </label>
        </div>

        <label>
          Time zone
          <select {...field('timezone')} value={form.timezone} onChange={(e) => set('timezone', e.target.value)}>
            {zones.map((z) => (
              <option key={z} value={z}>
                {z.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
          <span className="hint">Times above are entered in this zone — usually where the venue is.</span>
          {err('timezone')}
        </label>

        <label>
          Venue / location
          <input {...field('venue')} value={form.venue} onChange={(e) => set('venue', e.target.value)} />
          {err('venue')}
        </label>

        <div className="image-field">
          <EventPhoto
            key={form.imageUrl}
            event={{ id: id ?? 'new', title: form.title, imageUrl: form.imageUrl.trim() || null }}
            width={320}
            className="image-preview"
          />
          <label>
            <span>
              Cover image URL <span className="muted">(optional)</span>
            </span>
            <input
              {...field('imageUrl')}
              type="url"
              placeholder="https://images.unsplash.com/…"
              value={form.imageUrl}
              onChange={(e) => set('imageUrl', e.target.value)}
            />
            <span className="hint">Paste an https link to a landscape photo. Leave empty and we’ll pick one that fits the title.</span>
            {err('imageUrl')}
          </label>
        </div>

        <div className="form-row">
          <label>
            Capacity
            <input
              {...field('capacity')}
              type="number"
              min={minCapacity}
              step={1}
              value={form.capacity}
              onChange={(e) => set('capacity', e.target.value)}
            />
            {original && original.activeRegistrations > 0 && (
              <span className="hint">{original.activeRegistrations} people are registered — capacity can't go below that.</span>
            )}
            {err('capacity')}
          </label>
          <label>
            Status
            <select {...field('status')} value={form.status} onChange={(e) => set('status', e.target.value as EventStatus)}>
              <option value="DRAFT">Draft — only you can see it</option>
              <option value="PUBLISHED">Published — open for registration</option>
            </select>
            {err('status')}
          </label>
        </div>

        <div className="form-actions">
          {isEdit && original?.status !== 'CANCELED' && (
            <button type="button" className="btn btn-danger-outline" onClick={cancelEvent} disabled={busy}>
              Cancel event
            </button>
          )}
          <span className="grow" />
          <Link to="/organizer" className="btn btn-ghost">
            Discard
          </Link>
          <button className="btn btn-primary" disabled={busy}>
            {busy ? 'Saving…' : isEdit ? 'Save changes' : 'Create event'}
          </button>
        </div>
      </form>
    </div>
  );
}
