export type Role = 'ORGANIZER' | 'ATTENDEE';
export type EventStatus = 'DRAFT' | 'PUBLISHED' | 'CANCELED';
export type ClosedReason = 'DRAFT' | 'CANCELED' | 'STARTED' | 'FULL' | null;

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface EventItem {
  id: string;
  title: string;
  description: string;
  startsAt: string;
  endsAt: string | null;
  timezone: string;
  startsLocal: string;
  endsLocal: string | null;
  venue: string;
  imageUrl: string | null;
  capacity: number;
  status: EventStatus;
  activeRegistrations: number;
  placesRemaining: number;
  registrationOpen: boolean;
  closedReason: ClosedReason;
  organizer: { id: string; name: string };
}

export interface Registration {
  id: string;
  status: 'ACTIVE' | 'CANCELED';
  registeredAt: string;
  canceledAt: string | null;
  event: EventItem;
}

export interface Attendee {
  id: string;
  status: 'ACTIVE' | 'CANCELED';
  registeredAt: string;
  canceledAt: string | null;
  attendee: { id: string; name: string; email: string };
}
