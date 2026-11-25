import jwt from 'jsonwebtoken';
import type { Role } from '@prisma/client';
import { config } from '../config.js';

export interface TokenPayload {
  sub: string;
  role: Role;
}

export function signToken(user: { id: string; role: Role }): string {
  return jwt.sign({ role: user.role }, config.jwtSecret, {
    subject: user.id,
    expiresIn: config.jwtExpiresIn as jwt.SignOptions['expiresIn'],
  });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as jwt.JwtPayload;
    if (!decoded.sub || !decoded.role) return null;
    return { sub: decoded.sub, role: decoded.role as Role };
  } catch {
    return null;
  }
}
