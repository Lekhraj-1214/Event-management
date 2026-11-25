import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { activeCount, api, makeEvent, makeUser, prisma, resetDb } from './helpers.js';

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

const register = (eventId: string, auth: Record<string, string>) =>
  api().post(`/api/events/${eventId}/registrations`).set(auth);

describe('attendee registration', () => {
  it('registers an attendee and reduces places remaining', async () => {
    const org = await makeUser('ORGANIZER');
    const att = await makeUser('ATTENDEE');
    const event = await makeEvent(org.id, { capacity: 5 });

    const res = await register(event.id, att.auth);
    expect(res.status).toBe(201);

    const detail = await api().get(`/api/events/${event.id}`).set(att.auth);
    expect(detail.body.event.placesRemaining).toBe(4);
    expect(detail.body.myRegistration.id).toBe(res.body.registration.id);
  });

  describe('duplicate prevention', () => {
    it('rejects a second registration by the same attendee', async () => {
      const org = await makeUser('ORGANIZER');
      const att = await makeUser('ATTENDEE');
      const event = await makeEvent(org.id);

      expect((await register(event.id, att.auth)).status).toBe(201);
      const second = await register(event.id, att.auth);
      expect(second.status).toBe(409);
      expect(second.body.error.code).toBe('ALREADY_REGISTERED');
      expect(await activeCount(event.id)).toBe(1);
    });

    it('creates only one registration when the same attendee double-submits concurrently', async () => {
      const org = await makeUser('ORGANIZER');
      const att = await makeUser('ATTENDEE');
      const event = await makeEvent(org.id);

      const results = await Promise.all(Array.from({ length: 10 }, () => register(event.id, att.auth)));
      expect(results.filter((r) => r.status === 201)).toHaveLength(1);
      expect(results.filter((r) => r.status === 409).every((r) => r.body.error.code === 'ALREADY_REGISTERED')).toBe(true);
      expect(await activeCount(event.id)).toBe(1);
    });

    it('allows re-registering after canceling', async () => {
      const org = await makeUser('ORGANIZER');
      const att = await makeUser('ATTENDEE');
      const event = await makeEvent(org.id);

      const first = await register(event.id, att.auth);
      await api().post(`/api/me/registrations/${first.body.registration.id}/cancel`).set(att.auth).expect(200);
      expect((await register(event.id, att.auth)).status).toBe(201);
      expect(await activeCount(event.id)).toBe(1);
    });

    it('is also enforced by the database (partial unique index)', async () => {
      const org = await makeUser('ORGANIZER');
      const att = await makeUser('ATTENDEE');
      const event = await makeEvent(org.id);
      await prisma.registration.create({ data: { eventId: event.id, userId: att.id } });
      await expect(prisma.registration.create({ data: { eventId: event.id, userId: att.id } })).rejects.toThrow();
    });
  });

  describe('capacity', () => {
    it('rejects registration when the event is full', async () => {
      const org = await makeUser('ORGANIZER');
      const [a, b] = [await makeUser('ATTENDEE'), await makeUser('ATTENDEE')];
      const event = await makeEvent(org.id, { capacity: 1 });

      expect((await register(event.id, a.auth)).status).toBe(201);
      const res = await register(event.id, b.auth);
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('EVENT_FULL');
    });

    it('gives the last place to exactly one of many simultaneous requests', async () => {
      const org = await makeUser('ORGANIZER');
      const event = await makeEvent(org.id, { capacity: 1 });
      const attendees = await Promise.all(Array.from({ length: 25 }, () => makeUser('ATTENDEE')));

      const results = await Promise.all(attendees.map((a) => register(event.id, a.auth)));

      expect(results.filter((r) => r.status === 201)).toHaveLength(1);
      expect(results.filter((r) => r.status === 409 && r.body.error.code === 'EVENT_FULL')).toHaveLength(24);
      expect(await activeCount(event.id)).toBe(1);
    });

    it('never exceeds capacity under concurrent load (capacity 5, 30 requests)', async () => {
      const org = await makeUser('ORGANIZER');
      const event = await makeEvent(org.id, { capacity: 5 });
      const attendees = await Promise.all(Array.from({ length: 30 }, () => makeUser('ATTENDEE')));

      const results = await Promise.all(attendees.map((a) => register(event.id, a.auth)));

      expect(results.filter((r) => r.status === 201)).toHaveLength(5);
      expect(await activeCount(event.id)).toBe(5);
    });

    it('releases a place when a registration is canceled', async () => {
      const org = await makeUser('ORGANIZER');
      const [a, b] = [await makeUser('ATTENDEE'), await makeUser('ATTENDEE')];
      const event = await makeEvent(org.id, { capacity: 1 });

      const reg = await register(event.id, a.auth);
      expect((await register(event.id, b.auth)).body.error.code).toBe('EVENT_FULL');

      await api().post(`/api/me/registrations/${reg.body.registration.id}/cancel`).set(a.auth).expect(200);
      expect((await register(event.id, b.auth)).status).toBe(201);
    });
  });

  describe('event availability', () => {
    it('rejects registration for canceled events', async () => {
      const org = await makeUser('ORGANIZER');
      const att = await makeUser('ATTENDEE');
      const event = await makeEvent(org.id, { status: 'CANCELED' });
      const res = await register(event.id, att.auth);
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('EVENT_CANCELED');
    });

    it('treats draft events as not found', async () => {
      const org = await makeUser('ORGANIZER');
      const att = await makeUser('ATTENDEE');
      const event = await makeEvent(org.id, { status: 'DRAFT' });
      expect((await register(event.id, att.auth)).status).toBe(404);
    });

    it('rejects registration for events that have started', async () => {
      const org = await makeUser('ORGANIZER');
      const att = await makeUser('ATTENDEE');
      const event = await makeEvent(org.id, { startsAt: new Date(Date.now() - 60_000) });
      const res = await register(event.id, att.auth);
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('EVENT_STARTED');
    });
  });

  describe('canceling', () => {
    it('rejects canceling the same registration twice', async () => {
      const org = await makeUser('ORGANIZER');
      const att = await makeUser('ATTENDEE');
      const event = await makeEvent(org.id);
      const reg = await register(event.id, att.auth);
      const url = `/api/me/registrations/${reg.body.registration.id}/cancel`;

      await api().post(url).set(att.auth).expect(200);
      const again = await api().post(url).set(att.auth);
      expect(again.status).toBe(409);
      expect(again.body.error.code).toBe('ALREADY_CANCELED');
    });

    it('rejects canceling once the event has started', async () => {
      const org = await makeUser('ORGANIZER');
      const att = await makeUser('ATTENDEE');
      const event = await makeEvent(org.id);
      const reg = await register(event.id, att.auth);
      await prisma.event.update({ where: { id: event.id }, data: { startsAt: new Date(Date.now() - 60_000) } });

      const res = await api().post(`/api/me/registrations/${reg.body.registration.id}/cancel`).set(att.auth);
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('EVENT_STARTED');
      expect(await activeCount(event.id)).toBe(1);
    });
  });

  describe('access control', () => {
    it('requires sign-in', async () => {
      const org = await makeUser('ORGANIZER');
      const event = await makeEvent(org.id);
      expect((await api().post(`/api/events/${event.id}/registrations`)).status).toBe(401);
    });

    it('does not let organizers register', async () => {
      const org = await makeUser('ORGANIZER');
      const event = await makeEvent(org.id);
      expect((await register(event.id, org.auth)).status).toBe(403);
    });

    it("does not let an attendee cancel someone else's registration", async () => {
      const org = await makeUser('ORGANIZER');
      const [a, b] = [await makeUser('ATTENDEE'), await makeUser('ATTENDEE')];
      const event = await makeEvent(org.id);
      const reg = await register(event.id, a.auth);

      const res = await api().post(`/api/me/registrations/${reg.body.registration.id}/cancel`).set(b.auth);
      expect(res.status).toBe(403);
      expect(await activeCount(event.id)).toBe(1);
    });

    it('lists only the caller’s own registrations', async () => {
      const org = await makeUser('ORGANIZER');
      const [a, b] = [await makeUser('ATTENDEE'), await makeUser('ATTENDEE')];
      const event = await makeEvent(org.id);
      await register(event.id, a.auth);

      const res = await api().get('/api/me/registrations').set(b.auth);
      expect(res.body.registrations).toEqual([]);
    });
  });
});
