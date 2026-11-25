import type { Request, RequestHandler } from 'express';
import type { Role } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { verifyToken } from '../lib/auth.js';
import { forbidden, unauthorized } from '../lib/errors.js';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

async function resolveUser(req: Request): Promise<AuthUser | undefined> {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return undefined;
  const payload = verifyToken(header.slice('Bearer '.length));
  if (!payload) return undefined;
  // Re-read the user so deleted users / role changes take effect immediately.
  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { id: true, name: true, email: true, role: true },
  });
  return user ?? undefined;
}

/** Attaches req.user if a valid token is present, but never rejects. */
export const optionalAuth: RequestHandler = async (req, _res, next) => {
  req.user = await resolveUser(req);
  next();
};

/** Rejects with 401 unless a valid token is present. */
export const requireAuth: RequestHandler = async (req, _res, next) => {
  req.user = await resolveUser(req);
  if (!req.user) throw unauthorized();
  next();
};

/** Must run after requireAuth. Rejects with 403 if the user has a different role. */
export const requireRole =
  (role: Role): RequestHandler =>
  (req, _res, next) => {
    if (!req.user) throw unauthorized();
    if (req.user.role !== role) {
      throw forbidden(role === 'ORGANIZER' ? 'Only organizers can do that.' : 'Only attendees can do that.');
    }
    next();
  };
