import { z } from 'zod';
import { isValidTimeZone } from './lib/time.js';

const localDateTime = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/, 'Use the format YYYY-MM-DDTHH:mm');

export const signupSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  email: z.email('Enter a valid email').trim().toLowerCase(),
  password: z.string().min(8, 'Password must be at least 8 characters').max(200),
  role: z.enum(['ORGANIZER', 'ATTENDEE']),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase(),
  password: z.string(),
});

const eventFields = {
  title: z.string().trim().min(1, 'Title is required').max(200),
  description: z.string().trim().min(1, 'Description is required').max(10_000),
  /** Wall-clock start time in the event's own time zone. */
  startsLocal: localDateTime,
  endsLocal: localDateTime.nullable().optional(),
  timezone: z.string().refine(isValidTimeZone, 'Unknown time zone'),
  venue: z.string().trim().min(1, 'Venue is required').max(300),
  imageUrl: z
    .url({ protocol: /^https$/, message: 'Image must be an https:// URL' })
    .max(2000)
    .nullable()
    .optional(),
  capacity: z.number().int('Capacity must be a whole number').positive('Capacity must be at least 1').max(100_000),
  status: z.enum(['DRAFT', 'PUBLISHED', 'CANCELED']),
};

export const createEventSchema = z.object({ ...eventFields, status: eventFields.status.default('DRAFT') });

export const updateEventSchema = z
  .object(eventFields)
  .partial()
  .refine((v) => (v.startsLocal === undefined) === (v.timezone === undefined), {
    message: 'startsLocal and timezone must be sent together',
    path: ['timezone'],
  });

export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;

export const uuidParam = z.uuid();
