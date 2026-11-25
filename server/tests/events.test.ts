import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { api, makeEvent, makeUser, prisma, resetDb } from './helpers.js';

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

const validBody = {
  title: 'Launch party',
  description: 'Come celebrate',
  startsLocal: '2030-06-01T18:00',
  endsLocal: '2030-06-01T21:00',
  timezone: 'Asia/Kolkata',
  venue: 'HSR Layout, Bengaluru',
  capacity: 20,
  status: 'PUBLISHED',
};

describe('creating events', () => {
  it('lets an organizer create an event and stores the time in UTC using the event time zone', async () => {
    const org = await makeUser('ORGANIZER');
    const res = await api().post('/api/events').set(org.auth).send(validBody);
    expect(res.status).toBe(201);
    // 18:00 in India (UTC+5:30) is 12:30 UTC.
    expect(res.body.event.startsAt).toBe('2030-06-01T12:30:00.000Z');
    expect(res.body.event.startsLocal).toBe('2030-06-01T18:00');
    expect(res.body.event.placesRemaining).toBe(20);
  });

  it('forbids attendees from creating events', async () => {
    const att = await makeUser('ATTENDEE');
    expect((await api().post('/api/events').set(att.auth).send(validBody)).status).toBe(403);
  });

  it.each([
    [{ capacity: 0 }, 'capacity'],
    [{ capacity: -5 }, 'capacity'],
    [{ capacity: 2.5 }, 'capacity'],
    [{ title: '   ' }, 'title'],
    [{ timezone: 'Mars/Olympus' }, 'timezone'],
    [{ startsLocal: 'tomorrow' }, 'startsLocal'],
    [{ startsLocal: '2001-01-01T10:00', endsLocal: null }, 'startsLocal'],
    [{ endsLocal: '2030-06-01T17:00' }, 'endsLocal'],
    [{ imageUrl: 'javascript:alert(1)' }, 'imageUrl'],
    [{ imageUrl: 'http://insecure.example/x.jpg' }, 'imageUrl'],
  ])('rejects invalid input %o', async (patch, field) => {
    const org = await makeUser('ORGANIZER');
    const res = await api().post('/api/events').set(org.auth).send({ ...validBody, ...patch });
    expect(res.status).toBe(400);
    expect(res.body.error.details.map((d: { path: string }) => d.path)).toContain(field);
  });
});

describe('ownership', () => {
  it("prevents an organizer from editing another organizer's event", async () => {
    const owner = await makeUser('ORGANIZER');
    const other = await makeUser('ORGANIZER');
    const event = await makeEvent(owner.id);

    const res = await api().patch(`/api/events/${event.id}`).set(other.auth).send({ title: 'Hijacked' });
    expect(res.status).toBe(403);
    expect((await prisma.event.findUniqueOrThrow({ where: { id: event.id } })).title).toBe('Test event');
  });

  it("prevents an organizer from canceling another organizer's event", async () => {
    const owner = await makeUser('ORGANIZER');
    const other = await makeUser('ORGANIZER');
    const event = await makeEvent(owner.id);
    const res = await api().patch(`/api/events/${event.id}`).set(other.auth).send({ status: 'CANCELED' });
    expect(res.status).toBe(403);
  });

  it("prevents an organizer from viewing another organizer's attendee list", async () => {
    const owner = await makeUser('ORGANIZER');
    const other = await makeUser('ORGANIZER');
    const event = await makeEvent(owner.id);
    expect((await api().get(`/api/organizer/events/${event.id}/attendees`).set(other.auth)).status).toBe(403);
  });

  it('prevents attendees from viewing attendee lists', async () => {
    const owner = await makeUser('ORGANIZER');
    const att = await makeUser('ATTENDEE');
    const event = await makeEvent(owner.id);
    expect((await api().get(`/api/organizer/events/${event.id}/attendees`).set(att.auth)).status).toBe(403);
  });

  it('shows the owner their attendee list with name, email and registration time', async () => {
    const owner = await makeUser('ORGANIZER');
    const att = await makeUser('ATTENDEE', 'Zara');
    const event = await makeEvent(owner.id);
    await api().post(`/api/events/${event.id}/registrations`).set(att.auth).expect(201);

    const res = await api().get(`/api/organizer/events/${event.id}/attendees`).set(owner.auth);
    expect(res.status).toBe(200);
    expect(res.body.attendees).toHaveLength(1);
    expect(res.body.attendees[0]).toMatchObject({ status: 'ACTIVE', attendee: { name: 'Zara', email: att.email } });
    expect(res.body.attendees[0].registeredAt).toEqual(expect.any(String));
  });

  it("lists only the organizer's own events on the dashboard", async () => {
    const owner = await makeUser('ORGANIZER');
    const other = await makeUser('ORGANIZER');
    await makeEvent(owner.id, { title: 'Mine' });
    await makeEvent(other.id, { title: 'Theirs' });
    const res = await api().get('/api/organizer/events').set(owner.auth);
    expect(res.body.events.map((e: { title: string }) => e.title)).toEqual(['Mine']);
  });
});

describe('editing events', () => {
  it('does not allow capacity below the number of active registrations', async () => {
    const owner = await makeUser('ORGANIZER');
    const event = await makeEvent(owner.id, { capacity: 5 });
    for (let i = 0; i < 3; i++) {
      const att = await makeUser('ATTENDEE');
      await api().post(`/api/events/${event.id}/registrations`).set(att.auth).expect(201);
    }

    const tooLow = await api().patch(`/api/events/${event.id}`).set(owner.auth).send({ capacity: 2 });
    expect(tooLow.status).toBe(409);
    expect(tooLow.body.error.code).toBe('CAPACITY_BELOW_REGISTRATIONS');

    const exact = await api().patch(`/api/events/${event.id}`).set(owner.auth).send({ capacity: 3 });
    expect(exact.status).toBe(200);
    expect(exact.body.event.placesRemaining).toBe(0);
  });

  it('never ends up over capacity when a capacity cut races with new registrations', async () => {
    const owner = await makeUser('ORGANIZER');
    const event = await makeEvent(owner.id, { capacity: 5 });
    for (let i = 0; i < 3; i++) {
      const att = await makeUser('ATTENDEE');
      await api().post(`/api/events/${event.id}/registrations`).set(att.auth).expect(201);
    }
    const newcomers = await Promise.all(Array.from({ length: 4 }, () => makeUser('ATTENDEE')));

    // Organizer lowers capacity to 4 at the same moment 4 more people try to register.
    await Promise.all([
      api().patch(`/api/events/${event.id}`).set(owner.auth).send({ capacity: 4 }),
      ...newcomers.map((a) => api().post(`/api/events/${event.id}/registrations`).set(a.auth)),
    ]);

    const final = await prisma.event.findUniqueOrThrow({ where: { id: event.id } });
    const active = await prisma.registration.count({ where: { eventId: event.id, status: 'ACTIVE' } });
    // Whichever request wins the lock first, the invariant holds.
    expect(active).toBeLessThanOrEqual(final.capacity);
  });

  it('treats canceled as a final state', async () => {
    const owner = await makeUser('ORGANIZER');
    const event = await makeEvent(owner.id);
    await api().patch(`/api/events/${event.id}`).set(owner.auth).send({ status: 'CANCELED' }).expect(200);
    const res = await api().patch(`/api/events/${event.id}`).set(owner.auth).send({ status: 'PUBLISHED' });
    expect(res.status).toBe(409);
  });

  it('does not let a published event with registrations go back to draft', async () => {
    const owner = await makeUser('ORGANIZER');
    const att = await makeUser('ATTENDEE');
    const event = await makeEvent(owner.id);
    await api().post(`/api/events/${event.id}/registrations`).set(att.auth).expect(201);
    const res = await api().patch(`/api/events/${event.id}`).set(owner.auth).send({ status: 'DRAFT' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('HAS_REGISTRATIONS');
  });
});

describe('public discovery', () => {
  it('lists only published, upcoming events', async () => {
    const org = await makeUser('ORGANIZER');
    await makeEvent(org.id, { title: 'Published' });
    await makeEvent(org.id, { title: 'Draft', status: 'DRAFT' });
    await makeEvent(org.id, { title: 'Canceled', status: 'CANCELED' });
    await makeEvent(org.id, { title: 'Past', startsAt: new Date(Date.now() - 3600_000) });

    const res = await api().get('/api/events');
    expect(res.status).toBe(200);
    expect(res.body.events.map((e: { title: string }) => e.title)).toEqual(['Published']);
  });

  it('hides draft event details from everyone but the owner', async () => {
    const owner = await makeUser('ORGANIZER');
    const other = await makeUser('ORGANIZER');
    const event = await makeEvent(owner.id, { status: 'DRAFT' });
    expect((await api().get(`/api/events/${event.id}`)).status).toBe(404);
    expect((await api().get(`/api/events/${event.id}`).set(other.auth)).status).toBe(404);
    expect((await api().get(`/api/events/${event.id}`).set(owner.auth)).status).toBe(200);
  });

  it('marks canceled events as closed for registration', async () => {
    const org = await makeUser('ORGANIZER');
    const event = await makeEvent(org.id, { status: 'CANCELED' });
    const res = await api().get(`/api/events/${event.id}`);
    expect(res.body.event.registrationOpen).toBe(false);
    expect(res.body.event.closedReason).toBe('CANCELED');
  });

  it('returns 404 for malformed ids', async () => {
    expect((await api().get('/api/events/not-a-uuid')).status).toBe(404);
  });
});
