import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import * as registrations from '../services/registrations.js';
import { idParam } from './events.js';

export const meRouter = Router();
meRouter.use(requireAuth, requireRole('ATTENDEE'));

meRouter.get('/registrations', async (req, res) => {
  res.json({ registrations: await registrations.listMyRegistrations(req.user!.id) });
});

meRouter.post('/registrations/:id/cancel', async (req, res) => {
  const result = await registrations.cancelRegistration(idParam(req), req.user!.id);
  res.json({ registration: result, message: 'Your registration has been canceled.' });
});
