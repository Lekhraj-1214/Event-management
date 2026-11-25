# Gather: Event Management App

Organizers create and manage events. Attendees discover them, register, and cancel.

**Stack:** React 19 + Vite + TypeScript (frontend), Node + Express 5 + TypeScript (API), PostgreSQL 16 via Prisma ORM, Vitest + Supertest (tests).

```
.
├── server/                 Express API
│   ├── prisma/             schema, migrations (incl. raw-SQL constraints), seed
│   ├── src/
│   │   ├── routes/         thin HTTP layer: parse input → call service → respond
│   │   ├── services/       business rules (events.ts, registrations.ts)
│   │   ├── middleware/     auth (requireAuth / requireRole / optionalAuth)
│   │   ├── lib/            prisma client, errors, JWT, time-zone helpers
│   │   └── schemas.ts      zod request validation
│   ├── tests/              API integration tests against a real Postgres
│   └── scripts/race.ts     live concurrency demo against the running API
├── web/                    React SPA (pages/, components/, lib/)
└── docker-compose.yml      Postgres for local dev + test DB
```

---

## 1. Setup and running

### Prerequisites
- **Node.js 20+** and npm (built and tested on Node 24). Check with `node -v`.
- **PostgreSQL 14+**, from either:
  - **Docker Desktop** (recommended, nothing else to install). It must be running before step 2.
  - **A local Postgres install** (Homebrew, Postgres.app, or the Windows/Linux installer). See [Option B](#option-b-use-a-postgres-you-already-have).
- **An internet connection** in the browser: the Roboto font and event photos (Unsplash) are loaded from the web.

### Option A: Docker (recommended)

```bash
# 1. Get the code
git clone https://github.com/Lekhraj-1214/Event-management.git
cd Event-management

# 2. Start Postgres in Docker (creates the `eventapp` and `eventapp_test` databases)
docker compose up -d

# 3. Install dependencies (npm workspaces install both server/ and web/)
npm install

# 4. Create the env files from the examples (the defaults match docker-compose)
cp server/.env.example server/.env
cp server/.env.test.example server/.env.test

# 5. Create the tables and load the demo data
npm run db:setup

# 6. Start the API and the web app together
npm run dev
```

Open **http://localhost:5173** and click one of the demo-account buttons on the login page.

| What                 | URL                                |
|----------------------|------------------------------------|
| Web app              | http://localhost:5173              |
| API                  | http://localhost:4000/api          |
| API health check     | http://localhost:4000/api/health   |

The Vite dev server forwards `/api` requests to the Express server, so the browser only talks to one origin and no CORS setup is needed in dev.

> **Port 5432 already in use?** (common if Postgres is also installed locally) Start Docker's Postgres on another port, and point the env files at it:
> ```bash
> DB_PORT=5433 docker compose up -d
> ```
> Then use `localhost:5433` instead of `localhost:5432` in `DATABASE_URL` in both `server/.env` and `server/.env.test`.

### Option B: Use a Postgres you already have

Create the two databases, then follow Option A from step 3:

```bash
createdb eventapp
createdb eventapp_test
```

In `server/.env` and `server/.env.test`, set `DATABASE_URL` to match your server:

```
postgresql://<user>:<password>@localhost:<port>/eventapp        # server/.env
postgresql://<user>:<password>@localhost:<port>/eventapp_test   # server/.env.test
```

For a default Homebrew install that's usually `postgresql://<your-mac-username>@localhost:5432/eventapp` (no password).

### Stopping and starting again

- **Stop the app:** press `Ctrl + C` in the terminal running `npm run dev`. This frees ports 5173 and 4000.
- **Stop the database:** `docker compose stop`. Data is kept in a Docker volume.
- **Start again later:** `docker compose start`, then `npm run dev`. No need to repeat setup.
- **Reset the demo data:** `npm run db:seed -w server`.
- **Remove everything, including the database volume:** `docker compose down -v`.

### Troubleshooting

| Problem | Fix |
|---|---|
| `Missing required environment variable JWT_SECRET` | You skipped step 4. Copy the `.env.example` files. |
| `Can't reach database server at localhost:5432` | Postgres isn't running (`docker compose ps`), or it's on a different port than `DATABASE_URL` says. |
| `port is already allocated` from Docker | Another Postgres is using 5432. Use `DB_PORT=5433` (see above). |
| `EADDRINUSE` on 4000 or 5173 | Something is already using the port. Find it with `lsof -i :4000` and stop it, or set `API_PORT` in `server/.env`. |
| Login says the email or password is wrong | The demo data isn't loaded. Run `npm run db:setup`. |
| Event photos don't show | No internet connection. The app still works and shows placeholders. |

### Environment variables (`server/.env`)

| Variable       | Example                                                  | Purpose                                     |
|----------------|----------------------------------------------------------|---------------------------------------------|
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/eventapp` | Postgres connection                         |
| `JWT_SECRET`   | long random string                                       | Signs auth tokens. **Required.**            |
| `API_PORT`     | `4000`                                                   | API port                                    |
| `CORS_ORIGIN`  | `http://localhost:5173`                                  | Allowed browser origin (non-proxied access) |

`server/.env.test` sets the same variables for the **test database**. Tests truncate tables, so never point it at real data.

No real secrets are committed. `.env` files are git-ignored, and only `.example` files are included.

### Seeded accounts

All accounts use the password **`password123`**. The login page also has one-click demo buttons.

| Role      | Email               | What you'll see                                                                 |
|-----------|---------------------|---------------------------------------------------------------------------------|
| Organizer | `alice@example.com` | 6 events: published, **1 spot left** (Postgres Workshop, 11/12), draft, canceled, and a finished event |
| Organizer | `olly@example.com`  | 5 events incl. **Jazz Night (capacity 1, empty)** for the last-seat demo and a **sold-out** Demo Night |
| Organizer | `priya@example.com` | 4 events incl. a 400-seat summit and Open Mic (69/70)                            |
| Attendee  | `carol@example.com` | Upcoming tickets, one for an event the organizer **canceled**, one she canceled herself, and a past event |
| Attendee  | `dave@example.com`  | Holds the last Demo Night seat, plus the workshop and a past event               |
| Attendee  | `erin@example.com`  | One active and one canceled registration                                         |
| Attendee  | `farah@example.com`, `gautam@example.com` | No registrations: clean accounts for trying the flow     |

The seed also creates **240 generated attendees** and about **1,000 registrations** spread over the past few weeks, so capacity bars, attendee lists and dashboards look like a real product. Events span 10 cities across 8 time zones (Bengaluru, Mumbai, Pune, London, Berlin, Lisbon, New York, San Francisco, Sydney, Singapore), plus one online event.

Re-run `npm run db:seed -w server` at any time to reset to this state.

### Tests

```bash
npm test            # applies migrations to eventapp_test, then runs all 44 API tests
```

Tests need Postgres running and `server/.env.test` in place (steps 2 and 4). They use the separate `eventapp_test` database and empty its tables between tests, so your demo data is never touched.

### Other scripts

```bash
npm run build                       # typecheck + build both packages
npm run race -w server -- 30 1      # live concurrency demo (API must be running): 30 attendees, 1 seat
```

---

## 2. Data model

```
User ──< Event            (organizerId)
User ──< Registration >── Event
```

| Table            | Key columns                                                                                                         |
|------------------|---------------------------------------------------------------------------------------------------------------------|
| **User**         | `id`, `name`, `email` (unique), `passwordHash`, `role` (`ORGANIZER` \| `ATTENDEE`)                                   |
| **Event**        | `id`, `organizerId`, `title`, `description`, `startsAt` / `endsAt` (timestamptz), `timezone` (IANA), `venue`, `imageUrl` (optional, https only), `capacity`, `status` (`DRAFT` \| `PUBLISHED` \| `CANCELED`) |
| **Registration** | `id`, `eventId`, `userId`, `status` (`ACTIVE` \| `CANCELED`), `createdAt`, `canceledAt`                               |

**Database-level guarantees** (in [the constraints migration](server/prisma/migrations/20261125052853_registration_constraints/migration.sql)):
- `UNIQUE (eventId, userId) WHERE status = 'ACTIVE'`: a partial unique index, so an attendee can hold only one *active* registration per event. Canceled rows stay for history and don't block re-registering.
- `CHECK (capacity > 0)` and `CHECK (endsAt IS NULL OR endsAt > startsAt)`.

**Time zones:** an event stores an absolute instant (`startsAt`, UTC) **plus** the IANA zone it takes place in (`timezone`). The organizer enters wall-clock time ("18:00") and picks a zone ("Asia/Kolkata"). The server converts this with Luxon. The UI always shows times in the event's zone, and also shows the viewer's local time when the two differ. Storing the zone (not just an offset) keeps daylight-saving rules correct.

**Cover photos:** organizers can paste an `https://` image URL. If they don't, the UI picks a stock photo that matches the title. Seed and fallback photos are hot-linked from Unsplash (free to use under the Unsplash License). In production I'd add uploads to object storage (S3) with resizing, instead of trusting external URLs.

**Registration count is derived, not stored:** places remaining = `capacity − COUNT(active registrations)`. A separate counter column could drift out of sync, and with an index on `(eventId, status)` the count is cheap at this scale.

---

## 3. Key decisions

### Concurrency: the last place
Registering is a check-then-insert ("is there room? → insert"). If two requests run that check at the same time, both see one free place and both insert. The registration service ([registrations.ts](server/src/services/registrations.ts)) prevents this as follows:

1. It opens a transaction and **locks the event row** with `SELECT … FROM "Event" WHERE id = $1 FOR UPDATE`.
2. Inside the lock it re-checks status, start time, any duplicate registration, and `count(active) < capacity`, then inserts.
3. It commits, which releases the lock.

All registration attempts for **the same event** run one at a time, while attempts for different events don't block each other. The same lock is taken when an organizer edits capacity, so "reduce capacity" and "register" can't race either.

**How I verified it:**
- The automated tests fire 25 simultaneous requests at a 1-seat event and 30 at a 5-seat event, and assert exactly 1 and exactly 5 successes. A third test races a capacity cut against new registrations.
- **I removed `FOR UPDATE` and re-ran the tests: 11 people got the 1-seat event and 17 got the 5-seat event.** Removing the lock from the edit path made the capacity-cut test fail in 5 out of 5 runs. So the tests do catch the races, and the lock is what fixes them.
- `npm run race -w server -- 40 3` shows the same against the live server: `3 registered, 37 EVENT_FULL`.

**Alternatives I considered:**
- `SERIALIZABLE` isolation: also correct, but losing transactions fail with serialization errors that need retry logic.
- A conditional counter update (`UPDATE … SET count = count + 1 WHERE count < capacity`): very fast, but it adds a counter column that has to stay in sync.

Row locking is the simplest option that is clearly correct. Its cost is that a very popular event's registrations are processed one at a time (see *Improvements*).

### Duplicate registration
There are two layers: an application check inside the locked transaction (returns a friendly `409 ALREADY_REGISTERED`), and the partial unique index as a backstop in the database. A unique violation (`P2002`) is also mapped to `409 ALREADY_REGISTERED`. Tested both sequentially and with 10 simultaneous double-clicks from the same user.

### Access control is enforced by the API
- `requireAuth` → 401, `requireRole('ORGANIZER' | 'ATTENDEE')` → 403.
- Ownership: every organizer write and the attendee list load the event and compare `organizerId` to the caller (403 if they differ). Attendees can only cancel their own registrations (403).
- Draft events return 404 to everyone except their owner.
- The React route guards (`RequireRole`) only improve the UX. Every rule above is also covered by API tests.

### Event status rules
- `DRAFT → PUBLISHED / CANCELED`, `PUBLISHED → CANCELED`.
- `PUBLISHED → DRAFT` only when there are no active registrations, so attendees can't quietly lose an event.
- `CANCELED` is final: the event can't be edited and registration is closed. Existing registrations are kept, and attendees see "Event canceled by organizer" on their dashboard.
- Capacity can't be set below the current number of active registrations (`409 CAPACITY_BELOW_REGISTRATIONS`).

### API error format
Every error is `{ error: { code, message, details? } }`, with a stable `code` (e.g. `EVENT_FULL`, `EVENT_STARTED`, `ALREADY_REGISTERED`). The UI shows `message` directly, and validation `details` are mapped to individual form fields.

### Main API routes
| Method | Path                                    | Who                   |
|--------|-----------------------------------------|-----------------------|
| POST   | `/api/auth/signup`, `/api/auth/login`   | public                |
| GET    | `/api/auth/me`                          | signed in             |
| GET    | `/api/events`                           | public: published + upcoming |
| GET    | `/api/events/:id`                       | public (draft: owner only) |
| POST   | `/api/events`                           | organizer             |
| PATCH  | `/api/events/:id`                       | owning organizer (edit / publish / cancel) |
| POST   | `/api/events/:id/registrations`         | attendee              |
| GET    | `/api/organizer/events`                 | organizer (own events + counts) |
| GET    | `/api/organizer/events/:id/attendees`   | owning organizer      |
| GET    | `/api/me/registrations`                 | attendee              |
| POST   | `/api/me/registrations/:id/cancel`      | owning attendee       |

---

## 4. Assumptions and shortcuts

- **Auth is deliberately simple:** email + bcrypt password, and a JWT (8h) stored in `localStorage` and sent as a Bearer token. Users choose their role at signup.
  *In production I would:* use an httpOnly, Secure, SameSite cookie session (or short-lived access token + rotating refresh token) instead of `localStorage`, to reduce XSS token theft; add rate limiting and lockout on login; verify emails; add password reset; and **not** let users self-assign the organizer role (it should be invite- or admin-approved). Alternatively, use a managed identity provider.
- "Has started" means `now >= startsAt`. Registration closes at that moment, and canceling a registration after that is also blocked.
- New events must start in the future. Past events stay visible on the organizer dashboard (marked "past") but not on the public listing.
- An event is canceled, not deleted, so registration history is kept.
- Organizers cannot register for events (registration is attendee-only).
- Search on the listing page is client-side. That's fine for a small dataset (see below).

## 5. What's done, what's not, and what I'd improve

**Completed:** all core requirements. That covers event CRUD with time zones and status rules, public discovery with loading/empty/error states, registration and cancellation with duplicate, capacity and concurrency protection, the organizer dashboard with attendee lists and ownership checks, the attendee dashboard (upcoming / canceled / past), and 44 API tests. A line-by-line check of the brief is in [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md).

**Not done / known gaps:**
- No frontend unit or E2E tests. The tests focus on the API, where the correctness rules live.
- No pagination on the listing, dashboards or attendee lists.
- No emails or notifications (e.g. telling attendees when an event is canceled).
- No waitlist when an event is full.

**With more time:**
- Playwright E2E tests for the main flows, including two browser contexts racing for the last seat.
- Server-side search, filters and pagination (keyset pagination on `startsAt`).
- For very high-demand events: replace the per-event row lock with an atomic conditional counter update, or a queue/token-bucket in front of registration.
- Notify attendees by email on cancellation, and offer a waitlist with automatic promotion when a place frees up.
- httpOnly cookie auth, rate limiting, audit log, structured logging and request IDs, OpenAPI docs.
- CSV export of attendee lists.

## 6. Demo walkthrough

1. Listing page: only published, upcoming events are shown (the draft and canceled seeds are hidden). Show search and the places-left meters.
2. Sign in as **Farah** (a clean account) → open *Intimate Jazz Night* (1 seat) → Register → success toast, event shows **Full**, and times appear in New York time and in your local time.
3. Sign in as **Gautam** in a private window → same event → "Sold out". Via the API, a stale click gets `409 EVENT_FULL`.
4. Run `npm run race -w server -- 40 3` → exactly 3 succeed. Mention the `FOR UPDATE` experiment (11 overbookings without the lock).
5. Sign in as **Alice** → Dashboard (capacity / registered / available) → Postgres Workshop → Edit → set capacity 5 → blocked (11 registered) → Attendees list.
6. Open one of Olly's attendee-list URLs as Alice → "You can only view attendees for your own events" (403 from the API).
7. Create a new event (show validation and the time-zone picker) → publish → cancel it.
8. Run `npm test`.


