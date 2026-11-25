-- Database-level guarantees that back up the application logic.

-- 1. An attendee can hold at most ONE active registration per event.
--    Canceled registrations are kept for history and don't block re-registering.
CREATE UNIQUE INDEX "Registration_one_active_per_user_event"
  ON "Registration" ("eventId", "userId")
  WHERE "status" = 'ACTIVE';

-- 2. Capacity must always be positive.
ALTER TABLE "Event" ADD CONSTRAINT "Event_capacity_positive" CHECK ("capacity" > 0);

-- 3. End time (if provided) must be after the start time.
ALTER TABLE "Event" ADD CONSTRAINT "Event_endsAt_after_startsAt"
  CHECK ("endsAt" IS NULL OR "endsAt" > "startsAt");
