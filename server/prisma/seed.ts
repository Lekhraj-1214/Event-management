/*
 * Dev seed: wipes the database and creates realistic demo data.
 * Never run against production.
 *
 * - 3 organizers and 5 named demo attendees (all password "password123")
 * - 240 extra attendees with generated names, so events have believable turnout
 * - 15 events across cities and time zones, in every state: published, nearly full,
 *   sold out, draft, canceled and already finished
 */
import { PrismaClient, type EventStatus, type RegistrationStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { DateTime } from 'luxon';

const prisma = new PrismaClient();
const PASSWORD = 'password123';

const photo = (id: string) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1600&q=80`;

/** Deterministic pseudo-random numbers, so every seed run produces the same shape of data. */
let rngState = 42;
const rand = () => {
  rngState = (rngState * 1664525 + 1013904223) % 4294967296;
  return rngState / 4294967296;
};

const FIRST = ['Aarav', 'Ananya', 'Rohan', 'Isha', 'Kabir', 'Meera', 'Arjun', 'Diya', 'Vikram', 'Sara', 'Liam', 'Emma', 'Noah', 'Olivia', 'Lucas', 'Mia', 'Mateo', 'Sofia', 'Ethan', 'Chloe', 'Daniel', 'Hannah', 'Yuki', 'Kenji', 'Wei', 'Mei', 'Omar', 'Layla', 'Tomás', 'Inés', 'Jonas', 'Lena', 'Felix', 'Clara', 'Samuel', 'Grace', 'Nikhil', 'Pooja', 'Aditya', 'Neha'];
const LAST = ['Sharma', 'Iyer', 'Reddy', 'Nair', 'Kapoor', 'Mehta', 'Rao', 'Patel', 'Smith', 'Johnson', 'Garcia', 'Müller', 'Schmidt', 'Rossi', 'Silva', 'Tanaka', 'Chen', 'Kim', 'Haddad', 'Novak', 'Andersen', 'Okafor', "O'Brien", 'Costa', 'Fischer', 'Dubois', 'Martins', 'Singh', 'Gupta', 'Das'];

interface SeedEvent {
  key: string;
  organizer: 'alice' | 'olly' | 'priya';
  title: string;
  description: string;
  zone: string;
  /** days from today (negative = in the past) */
  inDays: number;
  hour: number;
  minute?: number;
  hours: number;
  venue: string;
  capacity: number;
  status: EventStatus;
  photoId: string;
  /** how many generated attendees hold an ACTIVE registration */
  filled: number;
}

const EVENTS: SeedEvent[] = [
  {
    key: 'react',
    organizer: 'alice',
    title: 'React Bengaluru Meetup — December Edition',
    description: `Our monthly meetup is back for the last edition of the year, hosted at WeWork Galaxy.

Agenda
• 6:00 pm — Doors open, chai and snacks
• 6:30 pm — "React Server Components in production: what we learned migrating a 200-screen app"
• 7:15 pm — "Profiling React like you mean it": a live walkthrough of the React DevTools profiler, and why your memo() calls might be making things slower
• 8:00 pm — Lightning talks (5 min each, sign up at the venue)
• 8:30 pm — Networking

Who should come: anyone writing React day to day, from juniors to tech leads. Talks are in English and will be recorded.

Please bring a government ID — building security will ask for it at reception.`,
    zone: 'Asia/Kolkata',
    inDays: 7,
    hour: 18,
    hours: 3,
    venue: 'WeWork Galaxy, 43 Residency Rd, Bengaluru',
    capacity: 120,
    status: 'PUBLISHED',
    photoId: '1524178232363-1fb2b075b655',
    filled: 76,
  },
  {
    key: 'postgres',
    organizer: 'alice',
    title: 'Postgres Performance Workshop',
    description: `A full-day, hands-on workshop for backend engineers who want to stop guessing why queries are slow.

What we'll cover
• Reading EXPLAIN (ANALYZE, BUFFERS) output without fear
• B-tree, partial and covering indexes — and when an index makes things worse
• Locking: row locks, SELECT … FOR UPDATE, deadlocks and how to avoid them
• Connection pooling with PgBouncer
• Fixing three real slow queries from production (anonymised)

Format: a small group (12 people max) so everyone gets help. You'll work on your own laptop against a provided dataset.

Requirements: comfortable with SQL basics, and a laptop with Docker installed. Lunch and coffee included.`,
    zone: 'Europe/London',
    inDays: 10,
    hour: 9,
    minute: 30,
    hours: 7,
    venue: 'Shoreditch Works, 32–38 Hoxton St, London',
    capacity: 12,
    status: 'PUBLISHED',
    photoId: '1522202176988-66273c2fd55f',
    filled: 9, // + Carol and Dave = 11 of 12, one place left
  },
  {
    key: 'design',
    organizer: 'alice',
    title: 'Design Systems in Practice',
    description: `An evening for designers and front-end engineers who maintain (or are about to build) a design system.

Three short talks followed by an open discussion:
• Tokens first: how we rebuilt our colour system for dark mode
• Getting adoption: treating your design system like an internal product
• Versioning components without breaking 40 product teams

Drinks and a light dinner provided. The space is a gallery, so seating is informal.`,
    zone: 'Europe/Berlin',
    inDays: 18,
    hour: 19,
    hours: 2.5,
    venue: 'Galerie Neun, Torstraße 89, Berlin',
    capacity: 60,
    status: 'PUBLISHED',
    photoId: '1515187029135-18ee286d815b',
    filled: 23,
  },
  {
    key: 'breakfast',
    organizer: 'alice',
    title: 'Founders Breakfast',
    description: `Informal breakfast for early-stage founders in Bengaluru. Still finalising the venue and the guest speaker, so this isn't published yet.`,
    zone: 'Asia/Kolkata',
    inDays: 25,
    hour: 8,
    hours: 2,
    venue: 'Third Wave Coffee, 100 Feet Rd, Indiranagar, Bengaluru',
    capacity: 20,
    status: 'DRAFT',
    photoId: '1495474472287-4d71bcdd2085',
    filled: 0,
  },
  {
    key: 'rooftop',
    organizer: 'alice',
    title: 'Rooftop Networking Evening',
    description: `Sunset drinks and conversations with people from Bengaluru's tech community.

Update: unfortunately we've had to cancel this event because the venue is closed for repairs. We'll announce a new date soon.`,
    zone: 'Asia/Kolkata',
    inDays: 5,
    hour: 18,
    minute: 30,
    hours: 3,
    venue: 'Skyye, UB City, Vittal Mallya Rd, Bengaluru',
    capacity: 80,
    status: 'CANCELED',
    photoId: '1519671482749-fd09be7ccebf',
    filled: 31,
  },
  {
    key: 'dataeng',
    organizer: 'alice',
    title: 'Data Engineering Meetup #14',
    description: `Talks on streaming pipelines with Kafka and dbt, followed by an open Q&A with local data platform teams.`,
    zone: 'Asia/Kolkata',
    inDays: -12,
    hour: 18,
    hours: 3,
    venue: '91springboard, Koramangala, Bengaluru',
    capacity: 90,
    status: 'PUBLISHED',
    photoId: '1505373877841-8d25f7d46678',
    filled: 72,
  },
  {
    key: 'jazz',
    organizer: 'olly',
    title: 'Intimate Jazz Night',
    description: `A late set with a local quartet in the back room. Just one seat left at the bar.

This listing has a capacity of 1, which makes it handy for trying out what happens when two people try to grab the last seat at the same time.`,
    zone: 'America/New_York',
    inDays: 6,
    hour: 20,
    hours: 2,
    venue: 'Blue Note, 131 W 3rd St, New York',
    capacity: 1,
    status: 'PUBLISHED',
    photoId: '1415201364774-f6f0bb35f28f',
    filled: 0,
  },
  {
    key: 'typescript',
    organizer: 'olly',
    title: 'TypeScript Deep Dive (Online)',
    description: `A 2-hour live session on the parts of TypeScript that actually pay off in large codebases.

• Generics you can still read six months later
• Discriminated unions for API responses and state machines
• Conditional and mapped types, with real examples (not puzzles)
• Making "any" impossible to sneak in: strict settings and lint rules

The Zoom link is emailed to registered attendees an hour before the start. A recording will be shared afterwards.`,
    zone: 'America/Los_Angeles',
    inDays: 14,
    hour: 10,
    hours: 2,
    venue: 'Online (Zoom)',
    capacity: 200,
    status: 'PUBLISHED',
    photoId: '1555066931-4365d14bab8c',
    filled: 118,
  },
  {
    key: 'demonight',
    organizer: 'olly',
    title: 'Indie Hackers Demo Night',
    description: `Eight bootstrapped founders, five minutes each, one live demo. No slides allowed.

After the demos we'll vote for the audience favourite and hang out. Pizza and drinks on us.`,
    zone: 'America/Los_Angeles',
    inDays: 9,
    hour: 18,
    hours: 3,
    venue: 'The Loft, 600 Townsend St, San Francisco',
    capacity: 80,
    status: 'PUBLISHED',
    photoId: '1556761175-5973dc0f32e7',
    filled: 79, // + Dave = sold out
  },
  {
    key: 'supper',
    organizer: 'olly',
    title: 'Sunday Supper Club',
    description: `A long-table dinner for 16 strangers: a four-course Portuguese menu with natural wines from the Douro.

Vegetarian option available — tell us at the door. Seating is shared; you'll leave with new friends.`,
    zone: 'Europe/Lisbon',
    inDays: 12,
    hour: 19,
    minute: 30,
    hours: 3,
    venue: 'Casa Alfama, Rua de São Miguel 24, Lisbon',
    capacity: 16,
    status: 'PUBLISHED',
    photoId: '1414235077428-338989a2e8c0',
    filled: 8,
  },
  {
    key: 'nye',
    organizer: 'olly',
    title: "New Year's Eve Harbour Concert",
    description: `Ring in the new year with live music, a DJ set until 1 am and a clear view of the midnight fireworks over the harbour.

Ticket includes entry and one drink. Over 18s only — ID checked at the door.`,
    zone: 'Australia/Sydney',
    inDays: 35,
    hour: 20,
    hours: 5,
    venue: 'Overseas Passenger Terminal, Circular Quay, Sydney',
    capacity: 300,
    status: 'PUBLISHED',
    photoId: '1470229722913-7c0e2dbbafd3',
    filled: 164,
  },
  {
    key: 'blues',
    organizer: 'priya',
    title: 'Live Jazz & Blues at The Bombay Room',
    description: `Our monthly live night with a resident trio, playing jazz standards and Delta blues. Full bar and kitchen open all evening.`,
    zone: 'Asia/Kolkata',
    inDays: 4,
    hour: 20,
    hours: 3,
    venue: 'The Bombay Room, Lower Parel, Mumbai',
    capacity: 150,
    status: 'PUBLISHED',
    photoId: '1511192336575-5a79af67a629',
    filled: 47,
  },
  {
    key: 'pmsummit',
    organizer: 'priya',
    title: 'Product Management Summit 2027',
    description: `A one-day conference for product managers and product leaders across Southeast Asia.

Tracks
• Discovery: running continuous user research with a team of two
• Delivery: roadmaps that survive contact with engineering
• Growth: pricing experiments, onboarding and activation

Includes lunch, coffee breaks and the evening reception. Talks will be recorded for attendees.`,
    zone: 'Asia/Singapore',
    inDays: 48,
    hour: 9,
    hours: 9,
    venue: 'Marina Bay Sands Expo, Singapore',
    capacity: 400,
    status: 'PUBLISHED',
    photoId: '1511578314322-379afb476865',
    filled: 231,
  },
  {
    key: 'openmic',
    organizer: 'priya',
    title: 'Open Mic Comedy Night',
    description: `Ten new comics, ten minutes each. Expect jokes about traffic, startups and parents.

Want to perform? Sign-ups at the venue from 7 pm, first come first served.`,
    zone: 'Asia/Kolkata',
    inDays: 3,
    hour: 20,
    hours: 2,
    venue: 'The Humming Tree, Indiranagar, Bengaluru',
    capacity: 70,
    status: 'PUBLISHED',
    photoId: '1475721027785-f74eccf877e2',
    filled: 69, // one place left
  },
  {
    key: 'coffeecode',
    organizer: 'priya',
    title: 'Coffee & Code Saturday',
    description: `Bring your side project, laptop and headphones. Two focused 90-minute coding blocks with a coffee break in between.

Good for anyone who works better around other people. No talks, no pitches.`,
    zone: 'Asia/Kolkata',
    inDays: 2,
    hour: 10,
    hours: 4,
    venue: 'Dialogues Café, Koregaon Park, Pune',
    capacity: 25,
    status: 'PUBLISHED',
    photoId: '1504384308090-c894fdcc538d',
    filled: 12,
  },
];

async function main() {
  await prisma.registration.deleteMany();
  await prisma.event.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const mk = (name: string, email: string, role: 'ORGANIZER' | 'ATTENDEE') =>
    prisma.user.create({ data: { name, email, role, passwordHash } });

  const organizers = {
    alice: await mk('Alice Fernandes', 'alice@example.com', 'ORGANIZER'),
    olly: await mk('Olly Brennan', 'olly@example.com', 'ORGANIZER'),
    priya: await mk('Priya Raghavan', 'priya@example.com', 'ORGANIZER'),
  };
  const carol = await mk('Carol Mendes', 'carol@example.com', 'ATTENDEE');
  const dave = await mk('Dave Kulkarni', 'dave@example.com', 'ATTENDEE');
  const erin = await mk('Erin Walsh', 'erin@example.com', 'ATTENDEE');
  await mk('Farah Haddad', 'farah@example.com', 'ATTENDEE');
  await mk('Gautam Rao', 'gautam@example.com', 'ATTENDEE');

  // Generated crowd (shares one password hash, so this is fast).
  const crowd = Array.from({ length: 240 }, (_, i) => {
    const first = FIRST[i % FIRST.length];
    const last = LAST[(Math.floor(i / FIRST.length) * 7 + i) % LAST.length];
    const slug = `${first}.${last}`.toLowerCase().normalize('NFD').replace(/[^a-z.]/g, '');
    return { name: `${first} ${last}`, email: `${slug}${i}@example.net`, role: 'ATTENDEE' as const, passwordHash };
  });
  await prisma.user.createMany({ data: crowd });
  const crowdUsers = await prisma.user.findMany({
    where: { email: { endsWith: '@example.net' } },
    select: { id: true },
    orderBy: { email: 'asc' },
  });

  const now = DateTime.now();
  const events: Record<string, string> = {};

  for (const e of EVENTS) {
    const start = now
      .setZone(e.zone)
      .plus({ days: e.inDays })
      .set({ hour: e.hour, minute: e.minute ?? 0, second: 0, millisecond: 0 });
    const createdAt = now.minus({ days: 30 + Math.max(0, -e.inDays) }).toJSDate();
    const event = await prisma.event.create({
      data: {
        organizerId: organizers[e.organizer].id,
        title: e.title,
        description: e.description,
        startsAt: start.toJSDate(),
        endsAt: start.plus({ minutes: e.hours * 60 }).toJSDate(),
        timezone: e.zone,
        venue: e.venue,
        capacity: e.capacity,
        status: e.status,
        imageUrl: photo(e.photoId),
        createdAt,
      },
    });
    events[e.key] = event.id;

    // Fill with a random slice of the crowd, registered at random times between listing and event.
    const shuffled = [...crowdUsers].sort(() => rand() - 0.5);
    const latest = Math.min(Date.now(), event.startsAt.getTime()) - 3600_000;
    const between = (from: number) => new Date(from + rand() * (latest - from));
    const active = shuffled
      .slice(0, e.filled)
      .map((u) => ({ eventId: event.id, userId: u.id, createdAt: between(createdAt.getTime()) }));
    // A few people who registered and later changed their mind.
    const canceledCount = e.filled > 5 ? Math.round(e.filled * 0.06) : 0;
    const canceled = shuffled.slice(e.filled, e.filled + canceledCount).map((u) => {
      const registeredAt = between(createdAt.getTime());
      return {
        eventId: event.id,
        userId: u.id,
        createdAt: registeredAt,
        status: 'CANCELED' as RegistrationStatus,
        canceledAt: between(registeredAt.getTime()),
      };
    });
    await prisma.registration.createMany({ data: [...active, ...canceled] });
  }

  // Hand-placed registrations for the demo accounts, so each dashboard tells a story.
  const daysAgo = (d: number) => now.minus({ days: d }).toJSDate();
  await prisma.registration.createMany({
    data: [
      // Carol: several upcoming, one for a canceled event, one she canceled herself, one past event.
      { eventId: events.react, userId: carol.id, createdAt: daysAgo(9) },
      { eventId: events.postgres, userId: carol.id, createdAt: daysAgo(6) },
      { eventId: events.supper, userId: carol.id, createdAt: daysAgo(2) },
      { eventId: events.rooftop, userId: carol.id, createdAt: daysAgo(11) },
      { eventId: events.design, userId: carol.id, createdAt: daysAgo(8), status: 'CANCELED', canceledAt: daysAgo(3) },
      { eventId: events.dataeng, userId: carol.id, createdAt: daysAgo(20) },
      // Dave: took the last Demo Night seat, plus the workshop and the past meetup.
      { eventId: events.postgres, userId: dave.id, createdAt: daysAgo(4) },
      { eventId: events.demonight, userId: dave.id, createdAt: daysAgo(1) },
      { eventId: events.dataeng, userId: dave.id, createdAt: daysAgo(15) },
      // Erin: one active, one canceled.
      { eventId: events.typescript, userId: erin.id, createdAt: daysAgo(5) },
      { eventId: events.react, userId: erin.id, createdAt: daysAgo(10), status: 'CANCELED', canceledAt: daysAgo(7) },
    ],
  });

  const [users, regs] = await Promise.all([prisma.user.count(), prisma.registration.count()]);
  console.log(`Seeded ${EVENTS.length} events, ${users} users, ${regs} registrations.`);
  console.log('All demo accounts use password:', PASSWORD);
  console.log('  Organizers: alice@example.com, olly@example.com, priya@example.com');
  console.log('  Attendees:  carol@example.com, dave@example.com, erin@example.com, farah@example.com, gautam@example.com');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
