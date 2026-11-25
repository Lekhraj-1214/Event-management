import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import * as events from '../services/events.js';
import { idParam } from './events.js';

export const organizerRouter = Router();
organizerRouter.use(requireAuth, requireRole('ORGANIZER'));

organizerRouter.get('/events', async (req, res) => {
  res.json({ events: await events.listOrganizerEvents(req.user!.id) });
});

organizerRouter.get('/events/:id/attendees', async (req, res) => {
  const id = idParam(req);
  const attendees = await events.listAttendees(id, req.user!.id);
  res.json({ attendees });
});
