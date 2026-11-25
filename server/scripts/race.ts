/**
 * Manual concurrency demo against a RUNNING API (npm run dev).
 *   npm run race -w server -- [attendees=30] [capacity=1]
 *
 * Creates an organizer + a fresh published event with the given capacity, signs up N new
 * attendees, then fires all N registration requests at the same instant and reports
 * how many succeeded. Expected: successes === capacity, never more.
 */
const API = process.env.API_URL ?? 'http://localhost:4000/api';
const attendees = Number(process.argv[2] ?? 30);
const capacity = Number(process.argv[3] ?? 1);
const runId = Date.now();

async function call(path: string, body?: unknown, token?: string) {
  const res = await fetch(`${API}${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
}

const signup = async (role: 'ORGANIZER' | 'ATTENDEE', i: number) =>
  (await call('/auth/signup', { name: `Racer ${i}`, email: `race-${runId}-${role}-${i}@example.com`, password: 'password123', role }))
    .body.token as string;

async function main() {
  const orgToken = await signup('ORGANIZER', 0);
  const tomorrow = new Date(Date.now() + 86400_000).toISOString().slice(0, 16);
  const { body } = await call(
    '/events',
    { title: `Race test ${runId}`, description: 'Concurrency demo', startsLocal: tomorrow, timezone: 'UTC', venue: 'Localhost', capacity, status: 'PUBLISHED' },
    orgToken,
  );
  const eventId = body.event.id as string;
  console.log(`Event ${eventId} created with capacity ${capacity}`);

  const tokens = await Promise.all(Array.from({ length: attendees }, (_, i) => signup('ATTENDEE', i + 1)));
  console.log(`Firing ${attendees} registrations simultaneously…`);

  const results = await Promise.all(tokens.map((t) => call(`/events/${eventId}/registrations`, {}, t)));
  const tally = results.reduce<Record<string, number>>((acc, r) => {
    const key = r.status === 201 ? '201 registered' : `${r.status} ${r.body.error?.code}`;
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
  console.table(tally);

  const detail = await call(`/events/${eventId}`);
  const ok = detail.body.event.activeRegistrations === capacity;
  console.log(`Active registrations in DB: ${detail.body.event.activeRegistrations} / capacity ${capacity} → ${ok ? 'OK ✅' : 'OVERBOOKED ❌'}`);
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error('Is the API running? (npm run dev)', e.message);
  process.exit(1);
});
