import { Router, type Request } from 'express';
import { notFound } from '../lib/errors.js';
import { optionalAuth, requireAuth, requireRole } from '../middleware/auth.js';
import { createEventSchema, updateEventSchema, uuidParam } from '../schemas.js';
import * as events from '../services/events.js';
import * as registrations from '../services/registrations.js';

export const eventsRouter = Router();

/** Malformed ids can't match anything, so treat them as 404 rather than a DB error. */
export function idParam(req: Request, name = 'id'): string {
  const parsed = uuidParam.safeParse(req.params[name]);
  if (!parsed.success) throw notFound();
  return parsed.data;
}

// Public: published, upcoming events.
eventsRouter.get('/', async (_req, res) => {
  res.json({ events: await events.listPublicUpcoming() });
});

// Public detail (drafts only visible to their owner). Includes the viewer's registration if signed in.
eventsRouter.get('/:id', optionalAuth, async (req, res) => {
  const id = idParam(req);
  const event = await events.getEventForViewer(id, req.user?.id);
  const myRegistration =
    req.user?.role === 'ATTENDEE' ? await registrations.findMyActiveRegistration(id, req.user.id) : null;
  res.json({ event, myRegistration, isOwner: req.user?.id === event.organizer.id });
});

eventsRouter.post('/', requireAuth, requireRole('ORGANIZER'), async (req, res) => {
  const input = createEventSchema.parse(req.body);
  res.status(201).json({ event: await events.createEvent(req.user!.id, input) });
});

eventsRouter.patch('/:id', requireAuth, requireRole('ORGANIZER'), async (req, res) => {
  const input = updateEventSchema.parse(req.body);
  res.json({ event: await events.updateEvent(idParam(req), req.user!.id, input) });
});

// Attendee registers for an event.
eventsRouter.post('/:id/registrations', requireAuth, requireRole('ATTENDEE'), async (req, res) => {
  const registration = await registrations.registerForEvent(idParam(req), req.user!.id);
  res.status(201).json({ registration, message: 'You are registered!' });
});
