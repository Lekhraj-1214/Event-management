import { Prisma, type Event, type EventStatus } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { badRequest, conflict, forbidden, notFound } from '../lib/errors.js';
import { instantToLocal, localToInstant } from '../lib/time.js';
import type { CreateEventInput, UpdateEventInput } from '../schemas.js';

/** Prisma `include` that counts only ACTIVE registrations. */
export const activeCountInclude = {
  organizer: { select: { id: true, name: true } },
  _count: { select: { registrations: { where: { status: 'ACTIVE' } } } },
} satisfies Prisma.EventInclude;

type EventWithCount = Prisma.EventGetPayload<{ include: typeof activeCountInclude }>;

export type ClosedReason = 'DRAFT' | 'CANCELED' | 'STARTED' | 'FULL' | null;

/** Why registration is closed (or null if it's open). Single source of truth for the UI. */
export function closedReason(event: Pick<Event, 'status' | 'startsAt' | 'capacity'>, activeCount: number, now = new Date()): ClosedReason {
  if (event.status === 'DRAFT') return 'DRAFT';
  if (event.status === 'CANCELED') return 'CANCELED';
  if (event.startsAt <= now) return 'STARTED';
  if (activeCount >= event.capacity) return 'FULL';
  return null;
}

export function serializeEvent(event: EventWithCount) {
  const active = event._count.registrations;
  const reason = closedReason(event, active);
  return {
    id: event.id,
    title: event.title,
    description: event.description,
    startsAt: event.startsAt.toISOString(),
    endsAt: event.endsAt?.toISOString() ?? null,
    timezone: event.timezone,
    // Wall-clock values in the event's zone, handy for edit forms.
    startsLocal: instantToLocal(event.startsAt, event.timezone),
    endsLocal: event.endsAt ? instantToLocal(event.endsAt, event.timezone) : null,
    venue: event.venue,
    imageUrl: event.imageUrl,
    capacity: event.capacity,
    status: event.status,
    activeRegistrations: active,
    placesRemaining: Math.max(event.capacity - active, 0),
    registrationOpen: reason === null,
    closedReason: reason,
    organizer: event.organizer,
    createdAt: event.createdAt.toISOString(),
    updatedAt: event.updatedAt.toISOString(),
  };
}

function toInstant(local: string, tz: string, field: string): Date {
  const date = localToInstant(local, tz);
  if (!date) throw badRequest('Some fields are invalid.', [{ path: field, message: 'Invalid date/time' }]);
  return date;
}

function assertEndAfterStart(startsAt: Date, endsAt: Date | null) {
  if (endsAt && endsAt <= startsAt) {
    throw badRequest('Some fields are invalid.', [{ path: 'endsLocal', message: 'End time must be after the start time' }]);
  }
}

export async function listPublicUpcoming() {
  const events = await prisma.event.findMany({
    where: { status: 'PUBLISHED', startsAt: { gt: new Date() } },
    orderBy: { startsAt: 'asc' },
    include: activeCountInclude,
  });
  return events.map(serializeEvent);
}

/** Public detail. Drafts are only visible to their organizer. */
export async function getEventForViewer(id: string, viewerId?: string) {
  const event = await prisma.event.findUnique({ where: { id }, include: activeCountInclude });
  if (!event || (event.status === 'DRAFT' && event.organizerId !== viewerId)) {
    throw notFound('Event not found.');
  }
  return serializeEvent(event);
}

export async function listOrganizerEvents(organizerId: string) {
  const events = await prisma.event.findMany({
    where: { organizerId },
    orderBy: { startsAt: 'desc' },
    include: activeCountInclude,
  });
  return events.map(serializeEvent);
}

export async function createEvent(organizerId: string, input: CreateEventInput) {
  const startsAt = toInstant(input.startsLocal, input.timezone, 'startsLocal');
  const endsAt = input.endsLocal ? toInstant(input.endsLocal, input.timezone, 'endsLocal') : null;
  if (startsAt <= new Date()) {
    throw badRequest('Some fields are invalid.', [{ path: 'startsLocal', message: 'Start time must be in the future' }]);
  }
  assertEndAfterStart(startsAt, endsAt);
  if (input.status === 'CANCELED') {
    throw badRequest('Some fields are invalid.', [{ path: 'status', message: 'A new event cannot be created as canceled' }]);
  }

  const event = await prisma.event.create({
    data: {
      organizerId,
      title: input.title,
      description: input.description,
      startsAt,
      endsAt,
      timezone: input.timezone,
      venue: input.venue,
      imageUrl: input.imageUrl ?? null,
      capacity: input.capacity,
      status: input.status,
    },
    include: activeCountInclude,
  });
  return serializeEvent(event);
}

/** Load an event and make sure `organizerId` owns it. Used by every organizer-only route. */
export async function getOwnedEvent(eventId: string, organizerId: string) {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) throw notFound('Event not found.');
  if (event.organizerId !== organizerId) throw forbidden('You can only manage your own events.');
  return event;
}

const allowedTransitions: Record<EventStatus, EventStatus[]> = {
  DRAFT: ['DRAFT', 'PUBLISHED', 'CANCELED'],
  PUBLISHED: ['PUBLISHED', 'DRAFT', 'CANCELED'],
  CANCELED: [], // terminal
};

export async function updateEvent(eventId: string, organizerId: string, input: UpdateEventInput) {
  return prisma.$transaction(
    async (tx) => {
      // Lock the event row so a concurrent registration can't slip in between our
      // "count active registrations" check and the capacity update.
      const locked = await tx.$queryRaw<Event[]>`SELECT * FROM "Event" WHERE id = ${eventId}::uuid FOR UPDATE`;
      const existing = locked[0];
      if (!existing) throw notFound('Event not found.');
      if (existing.organizerId !== organizerId) throw forbidden('You can only manage your own events.');
      if (existing.status === 'CANCELED') throw conflict('EVENT_CANCELED', 'Canceled events can no longer be edited.');

      const activeCount = await tx.registration.count({ where: { eventId, status: 'ACTIVE' } });

      const status = input.status ?? existing.status;
      if (!allowedTransitions[existing.status].includes(status)) {
        throw conflict('INVALID_STATUS_CHANGE', `Cannot change status from ${existing.status} to ${status}.`);
      }
      if (existing.status === 'PUBLISHED' && status === 'DRAFT' && activeCount > 0) {
        throw conflict(
          'HAS_REGISTRATIONS',
          'This event already has registrations, so it cannot go back to draft. Cancel it instead.',
        );
      }

      if (input.capacity !== undefined && input.capacity < activeCount) {
        throw conflict(
          'CAPACITY_BELOW_REGISTRATIONS',
          `Capacity cannot be lower than the ${activeCount} active registration${activeCount === 1 ? '' : 's'}.`,
        );
      }

      const timezone = input.timezone ?? existing.timezone;
      const startsAt = input.startsLocal ? toInstant(input.startsLocal, timezone, 'startsLocal') : existing.startsAt;
      const endsAt =
        input.endsLocal === undefined
          ? existing.endsAt
          : input.endsLocal === null
            ? null
            : toInstant(input.endsLocal, timezone, 'endsLocal');
      if (startsAt.getTime() !== existing.startsAt.getTime() && startsAt <= new Date()) {
        throw badRequest('Some fields are invalid.', [{ path: 'startsLocal', message: 'Start time must be in the future' }]);
      }
      assertEndAfterStart(startsAt, endsAt);

      const updated = await tx.event.update({
        where: { id: eventId },
        data: {
          title: input.title,
          description: input.description,
          venue: input.venue,
          imageUrl: input.imageUrl,
          capacity: input.capacity,
          status,
          timezone,
          startsAt,
          endsAt,
        },
        include: activeCountInclude,
      });
      return serializeEvent(updated);
    },
    { maxWait: 10_000, timeout: 10_000 },
  );
}

export async function listAttendees(eventId: string, organizerId: string) {
  const event = await getOwnedEvent(eventId, organizerId);
  const registrations = await prisma.registration.findMany({
    where: { eventId: event.id },
    orderBy: { createdAt: 'asc' },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
  return registrations.map((r) => ({
    id: r.id,
    status: r.status,
    registeredAt: r.createdAt.toISOString(),
    canceledAt: r.canceledAt?.toISOString() ?? null,
    attendee: r.user,
  }));
}
