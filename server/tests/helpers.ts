import request from 'supertest';
import type { EventStatus, Role } from '@prisma/client';
import { createApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import { signToken } from '../src/lib/auth.js';

export const app = createApp();
export const api = () => request(app);

export async function resetDb() {
  await prisma.$executeRawUnsafe('TRUNCATE "Registration", "Event", "User" RESTART IDENTITY CASCADE');
}

let seq = 0;
export async function makeUser(role: Role, name?: string) {
  seq += 1;
  const user = await prisma.user.create({
    data: {
      name: name ?? `${role.toLowerCase()} ${seq}`,
      email: `${role.toLowerCase()}${seq}-${Date.now()}@test.dev`,
      role,
      passwordHash: 'not-used-in-tests',
    },
  });
  return { ...user, token: signToken(user), auth: { Authorization: `Bearer ${signToken(user)}` } };
}

export async function makeEvent(
  organizerId: string,
  overrides: Partial<{ capacity: number; status: EventStatus; startsAt: Date; title: string }> = {},
) {
  return prisma.event.create({
    data: {
      organizerId,
      title: overrides.title ?? 'Test event',
      description: 'Desc',
      startsAt: overrides.startsAt ?? new Date(Date.now() + 7 * 24 * 3600 * 1000),
      timezone: 'Asia/Kolkata',
      venue: 'Somewhere',
      capacity: overrides.capacity ?? 10,
      status: overrides.status ?? 'PUBLISHED',
    },
  });
}

export const activeCount = (eventId: string) =>
  prisma.registration.count({ where: { eventId, status: 'ACTIVE' } });

export { prisma };
