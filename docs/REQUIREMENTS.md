# Requirements checklist

Each item in the assignment brief, with where it lives in the code and how it's verified.
"Test" means an automated test in `server/tests/` (run with `npm test`). "Manual" means checked in the browser.

**Legend:** ✅ done · 🟡 partly / with a documented assumption · ⬜ your action before submitting

---

## User roles

| Requirement | Status | Where | Verified by |
|---|---|---|---|
| Organizer creates and manages their own events, views registrations | ✅ | `server/src/routes/events.ts`, `server/src/routes/organizer.ts` | Tests: *creating events*, *ownership* |
| Attendee browses events and manages their own registrations | ✅ | `server/src/routes/me.ts` | Tests: *attendee registration* |
| Seeded accounts or simple auth, with shortcuts explained | ✅ | `server/prisma/seed.ts`, `server/src/routes/auth.ts`; README §4 | Manual: one-click demo logins |
| Role and ownership checks enforced by the **backend** | ✅ | `server/src/middleware/auth.ts` (`requireAuth`, `requireRole`), `getOwnedEvent` / `updateEvent` in `server/src/services/events.ts` | Tests: *forbids attendees from creating events*, *does not let organizers register*, all *ownership* tests |

## 1. Event creation and management

| Requirement | Status | Where | Verified by |
|---|---|---|---|
| Title and description | ✅ | `server/src/schemas.ts` (`eventFields`) | Test: *rejects invalid input* (blank title) |
| Start date/time **with the event's time zone** | ✅ | `startsAt` (UTC instant) + `timezone` (IANA) in `schema.prisma`; conversion in `server/src/lib/time.ts` | Test: *stores the time in UTC using the event time zone* (18:00 Asia/Kolkata → 12:30Z) |
| Venue or location | ✅ | `venue` column | Manual |
| Maximum capacity | ✅ | `capacity` column + DB `CHECK (capacity > 0)` | Tests: capacity 0, −5 and 2.5 rejected |
| Status: draft / published / canceled | ✅ | `EventStatus` enum; transition rules in `updateEvent` | Tests: *treats canceled as a final state*, *does not let a published event with registrations go back to draft* |
| Only the event's organizer can edit or cancel it | ✅ | `updateEvent` ownership check | Tests: *prevents an organizer from editing / canceling another organizer's event* |
| Validate required fields | ✅ | zod schemas + per-field errors shown in the form | Test: *rejects invalid input* (8 cases) |
| Capacity must be positive | ✅ | zod + DB `CHECK` | Test: *rejects invalid input* |
| Capacity can't drop below active registrations | ✅ | `updateEvent` (inside the row lock) | Tests: *does not allow capacity below the number of active registrations*, *never ends up over capacity when a capacity cut races with new registrations* |

## 2. Event discovery

| Requirement | Status | Where | Verified by |
|---|---|---|---|
| Public listing of published, upcoming events | ✅ | `listPublicUpcoming`; `web/src/pages/EventsPage.tsx` | Test: *lists only published, upcoming events* |
| Detail page: description, schedule, location, capacity, places remaining | ✅ | `web/src/pages/EventDetailPage.tsx` | Manual |
| Clear empty, loading and error states | ✅ | `web/src/components/States.tsx`, used on every page | Manual: skeleton grid, empty search, API-down error with retry |
| Draft and canceled events not available for registration | ✅ | Drafts 404 for non-owners; `closedReason()` drives the UI; API rejects | Tests: *hides draft event details…*, *marks canceled events as closed*, *rejects registration for canceled events*, *treats draft events as not found* |

## 3. Attendee registration

| Requirement | Status | Where | Verified by |
|---|---|---|---|
| Signed-in attendee can register and cancel their own registration | ✅ | `registerForEvent`, `cancelRegistration` in `server/src/services/registrations.ts` | Tests: *registers an attendee…*, *releases a place…* |
| No duplicate active registrations | ✅ | Check inside the locked transaction + partial unique index `(eventId, userId) WHERE status = 'ACTIVE'` | Tests: *rejects a second registration*, *…double-submits concurrently* (10 parallel), *is also enforced by the database* |
| No registration when full | ✅ | Count check inside the lock | Test: *rejects registration when the event is full* |
| No registration when canceled | ✅ | | Test: *rejects registration for canceled events* |
| No registration once started | ✅ | `startsAt <= now` check | Test: *rejects registration for events that have started* |
| Canceling releases a place | ✅ | Places are derived from active registrations | Test: *releases a place when a registration is canceled* |
| Simultaneous requests for the last place never exceed capacity | ✅ | `SELECT … FOR UPDATE` on the event row | Tests: 25-way race for 1 seat, 30-way race for 5 seats. Removing the lock makes them fail (11 and 17 overbookings). Live: `npm run race -w server -- 40 3` |
| Useful success and error messages | ✅ | Stable error codes + friendly messages; toasts in the UI | Manual |

## 4. Organizer dashboard

| Requirement | Status | Where | Verified by |
|---|---|---|---|
| List the organizer's events and status | ✅ | `GET /api/organizer/events`; `web/src/pages/OrganizerDashboard.tsx` | Test: *lists only the organizer's own events* |
| Capacity, active registrations, available places per event | ✅ | Table columns | Manual |
| Attendee list with name, email, registration time | ✅ | `GET /api/organizer/events/:id/attendees`; `web/src/pages/AttendeesPage.tsx` | Test: *shows the owner their attendee list with name, email and registration time* |
| Can't see another organizer's attendee list | ✅ | `listAttendees` → `getOwnedEvent` (403) | Tests: *prevents an organizer from viewing another organizer's attendee list*, *prevents attendees from viewing attendee lists* |

## 5. Attendee dashboard

| Requirement | Status | Where | Verified by |
|---|---|---|---|
| Upcoming registrations with event details | ✅ | `web/src/pages/MyRegistrationsPage.tsx` | Test: *lists only the caller's own registrations*; Manual (log in as Carol) |
| Option to cancel | ✅ | Cancel button per row | Tests: *rejects canceling the same registration twice*, *rejects canceling once the event has started* |
| Canceled registrations clearly distinguished | ✅ | Separate "Canceled registrations" section; events canceled by the organizer are labelled | Manual |

## Testing

| Requirement | Status | Where |
|---|---|---|
| Meaningful automated tests | ✅ | 44 API integration tests against real Postgres |
| Duplicate-registration prevention | ✅ | 4 tests (sequential, concurrent, DB-level, re-register after cancel) |
| Capacity handling | ✅ | 5 tests (full, two races, release on cancel, capacity cut vs. registrations) |
| Ownership checks | ✅ | 7 tests |
| Simultaneous registration | ✅ | Automated (above), plus the reproducible `race` script |

## Submission

| Item | Status | Notes |
|---|---|---|
| 1. Repository or archive | ⬜ | The project isn't a git repository yet. Run `git init`, commit, and push (or zip it without `node_modules`, `.pgdata` and `.env`). |
| 2. README: setup, env vars, seeded accounts, tests | ✅ | `README.md` §1. Checked: migrations and seed run cleanly against an empty database. |
| 3. Data model, key decisions, assumptions, trade-offs | ✅ | README §2–§4 |
| 4. Completed / unfinished / improvements | ✅ | README §5 |
| 5. Demo video | ⬜ | Script in README §6 |
| AI usage statement | ⬜ | README §7: write in your own words |

## Assumptions worth saying out loud in the walkthrough

- 🟡 **Auth is a shortcut:** JWT in `localStorage`, and users pick their own role. The README explains the production version (httpOnly cookies, rate limits, invite-only organizers).
- 🟡 **"Upcoming" means not yet started.** An event disappears from the public listing and closes registration at `startsAt`, not `endsAt`.
- 🟡 **Canceling an event keeps the registrations** (for history). Attendees see "Event canceled by organizer"; nobody is emailed.
- 🟡 **Cover photos are external URLs** (https only); there are no uploads.
