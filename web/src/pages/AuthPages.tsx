import { useState, type FormEvent, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import type { Role, User } from '../lib/types';
import { AUTH_PHOTO } from '../lib/photos';

function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="auth-shell">
      <div className="auth">{children}</div>
      <aside className="auth-photo">
        <img src={AUTH_PHOTO} alt="" />
        <div className="auth-photo-caption">
          <p>Host meetups, workshops and nights out. Capacity is enforced for you, even when everyone clicks at once.</p>
          <span>Gather for organizers</span>
        </div>
      </aside>
    </div>
  );
}

const DEMO = [
  { label: 'Alice (organizer)', email: 'alice@example.com' },
  { label: 'Olly (organizer)', email: 'olly@example.com' },
  { label: 'Priya (organizer)', email: 'priya@example.com' },
  { label: 'Carol (attendee)', email: 'carol@example.com' },
  { label: 'Dave (attendee)', email: 'dave@example.com' },
  { label: 'Farah (new attendee)', email: 'farah@example.com' },
];

function useAfterAuth() {
  const navigate = useNavigate();
  const from = (useLocation().state as { from?: string } | null)?.from;
  return (user: User) => navigate(from ?? (user.role === 'ORGANIZER' ? '/organizer' : '/'), { replace: true });
}

export function LoginPage() {
  const { login } = useAuth();
  const done = useAfterAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent, creds = { email, password }) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      done(await login(creds.email, creds.password));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell>
      <h1>Log in</h1>
      <p className="muted auth-sub">Welcome back. Log in to register for events or manage your own.</p>
      <form onSubmit={submit} className="form">
        {error && <div className="banner banner-error">{error}</div>}
        <label>
          Email
          <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
        </label>
        <label>
          Password
          <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        <button className="btn btn-primary btn-block" disabled={busy}>
          {busy ? 'Logging in…' : 'Log in'}
        </button>
      </form>
      <p className="muted small center">
        No account? <Link to="/signup">Create one</Link>
      </p>
      <div className="demo">
        <p className="demo-title">Demo accounts · password <code>password123</code></p>
        <div className="demo-buttons">
          {DEMO.map((d) => (
            <button
              key={d.email}
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={busy}
              onClick={(e) => submit(e, { email: d.email, password: 'password123' })}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>
    </AuthShell>
  );
}

export function SignupPage() {
  const { signup } = useAuth();
  const done = useAfterAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'ATTENDEE' as Role });
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);
  const fieldError = (p: string) => error?.fieldErrors.find((f) => f.path === p)?.message;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      done(await signup(form));
    } catch (err) {
      setError(err as ApiError);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell>
      <h1>Create an account</h1>
      <p className="muted auth-sub">Join as an attendee, or as an organizer to host your own events.</p>
      <form onSubmit={submit} className="form" noValidate>
        {error && <div className="banner banner-error">{error.message}</div>}
        <fieldset className="segmented">
          <legend className="sr-only">Account type</legend>
          {(['ATTENDEE', 'ORGANIZER'] as Role[]).map((r) => (
            <label key={r} className={form.role === r ? 'active' : ''}>
              <input type="radio" name="role" checked={form.role === r} onChange={() => setForm({ ...form, role: r })} />
              {r === 'ATTENDEE' ? 'I want to attend' : 'I organize events'}
            </label>
          ))}
        </fieldset>
        <label>
          Name
          <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          {fieldError('name') && <span className="field-error">{fieldError('name')}</span>}
        </label>
        <label>
          Email
          <input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          {fieldError('email') && <span className="field-error">{fieldError('email')}</span>}
        </label>
        <label>
          Password
          <input
            className="input"
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          <span className="hint">At least 8 characters.</span>
          {fieldError('password') && <span className="field-error">{fieldError('password')}</span>}
        </label>
        <button className="btn btn-primary btn-block" disabled={busy}>
          {busy ? 'Creating…' : 'Create account'}
        </button>
      </form>
      <p className="muted small center">
        Already have an account? <Link to="/login">Sign in</Link>
      </p>
    </AuthShell>
  );
}
