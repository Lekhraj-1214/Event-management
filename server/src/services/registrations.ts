import { Prisma, type Event } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { conflict, forbidden, notFound } from '../lib/errors.js';
import { activeCountInclude, serializeEvent } from './events.js';

/**
 * Register `userId` for `eventId`.
 *
 * Concurrency strategy: inside a transaction we take a row-level lock on the event
 * (SELECT ... FOR UPDATE). Every registration attempt for the same event therefore
 * runs its "count active registrations < capacity" check one at a time, so two
 * requests racing for the last place can never both succeed. Registrations for
 * *different* events don't block each other.
 *
 * A partial unique index (eventId, userId) WHERE status = 'ACTIVE' is the database
 * backstop against duplicate active registrations.
 */
export async function registerForEvent(eventId: string, userId: string) {
  try {
    return await prisma.$transaction(
      async (tx) => {
        const rows = await tx.$queryRaw<Pick<Event, 'id' | 'status' | 'startsAt' | 'capacity'>[]>`
          SELECT id, status, "startsAt", capacity FROM "Event" WHERE id = ${eventId}::uuid FOR UPDATE`;
        const event = rows[0];
        if (!event || event.status === 'DRAFT') throw notFound('Event not found.');
        if (event.status === 'CANCELED') throw conflict('EVENT_CANCELED', 'This event has been canceled.');
        if (event.startsAt <= new Date()) {
          throw conflict('EVENT_STARTED', 'Registration is closed because this event has already started.');
        }

        const existing = await tx.registration.findFirst({ where: { eventId, userId, status: 'ACTIVE' } });
        if (existing) throw conflict('ALREADY_REGISTERED', 'You are already registered for this event.');

        const activeCount = await tx.registration.count({ where: { eventId, status: 'ACTIVE' } });
        if (activeCount >= event.capacity) throw conflict('EVENT_FULL', 'Sorry, this event is full.');

        const registration = await tx.registration.create({ data: { eventId, userId } });
        return { id: registration.id, status: registration.status, registeredAt: registration.createdAt.toISOString() };
      },
      { maxWait: 10_000, timeout: 10_000 },
    );
  } catch (err) {
    // Backstop: the partial unique index fired (e.g. two tabs double-submitting).
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw conflict('ALREADY_REGISTERED', 'You are already registered for this event.');
    }
    throw err;
  }
}

/** Cancel the caller's own registration. Releases the place immediately. */
export async function cancelRegistration(registrationId: string, userId: string) {
  const registration = await prisma.registration.findUnique({
    where: { id: registrationId },
    include: { event: { select: { startsAt: true } } },
  });
  if (!registration) throw notFound('Registration not found.');
  if (registration.userId !== userId) throw forbidden('You can only cancel your own registrations.');
  if (registration.status === 'CANCELED') throw conflict('ALREADY_CANCELED', 'This registration is already canceled.');
  if (registration.event.startsAt <= new Date()) {
    throw conflict('EVENT_STARTED', 'This event has already started, so the registration can no longer be canceled.');
  }

  // Conditional update guards against a double-cancel race.
  const { count } = await prisma.registration.updateMany({
    where: { id: registrationId, status: 'ACTIVE' },
    data: { status: 'CANCELED', canceledAt: new Date() },
  });
  if (count === 0) throw conflict('ALREADY_CANCELED', 'This registration is already canceled.');
  return { id: registrationId, status: 'CANCELED' as const };
}

export async function listMyRegistrations(userId: string) {
  const registrations = await prisma.registration.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: { event: { include: activeCountInclude } },
  });
  return registrations.map((r) => ({
    id: r.id,
    status: r.status,
    registeredAt: r.createdAt.toISOString(),
    canceledAt: r.canceledAt?.toISOString() ?? null,
    event: serializeEvent(r.event),
  }));
}

/** The caller's active registration for an event, if any (used by the detail page). */
export async function findMyActiveRegistration(eventId: string, userId: string) {
  const r = await prisma.registration.findFirst({ where: { eventId, userId, status: 'ACTIVE' } });
  return r ? { id: r.id, status: r.status, registeredAt: r.createdAt.toISOString() } : null;
}
