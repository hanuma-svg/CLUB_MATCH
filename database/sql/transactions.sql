-- ============================================================================
-- ClubMatch ACID Transaction Workflows
-- ============================================================================

-- Transaction 1: Atomic Event Registration (with Row-Level Lock FOR UPDATE)
-- Prevents overbooking under concurrent requests and enforces deadline & uniqueness
/*
BEGIN;

SELECT event_id, max_capacity, current_registrations, registration_deadline, status
FROM events
WHERE event_id = $1
FOR UPDATE;

-- Application validates:
--   1. status IN ('UPCOMING', 'ONGOING')
--   2. NOW() <= registration_deadline
--   3. current_registrations < max_capacity
--   4. No active registration exists for (student_id, event_id)

INSERT INTO event_registrations (registration_id, student_id, event_id, status)
VALUES ($2, $3, $1, 'REGISTERED')
ON CONFLICT (student_id, event_id)
DO UPDATE SET status = 'REGISTERED', cancelled_at = NULL, registered_at = NOW()
WHERE event_registrations.status = 'CANCELLED';

-- Trigger trg_sync_event_registration_count automatically updates events.current_registrations
COMMIT;
*/

-- Transaction 2: Atomic Registration Cancellation + Rollback demonstration
/*
BEGIN;

SELECT registration_id, status
FROM event_registrations
WHERE student_id = $1 AND event_id = $2
FOR UPDATE;

UPDATE event_registrations
SET status = 'CANCELLED', cancelled_at = NOW()
WHERE student_id = $1 AND event_id = $2 AND status = 'REGISTERED';

-- On any validation failure (e.g., event already completed):
-- ROLLBACK;
COMMIT;
*/
