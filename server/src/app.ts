import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config.js';
import { errorHandler, notFoundHandler } from './lib/errors.js';
import { authRouter } from './routes/auth.js';
import { eventsRouter } from './routes/events.js';
import { organizerRouter } from './routes/organizer.js';
import { meRouter } from './routes/me.js';

export function createApp() {
  const app = express();
  app.use(helmet());
  app.use(cors({ origin: config.corsOrigin }));
  app.use(express.json({ limit: '100kb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });
  app.use('/api/auth', authRouter);
  app.use('/api/events', eventsRouter);
  app.use('/api/organizer', organizerRouter);
  app.use('/api/me', meRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
