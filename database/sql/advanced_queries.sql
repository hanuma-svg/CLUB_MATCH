-- ============================================================================
-- ClubMatch Advanced SQL Query Demonstrations (DDL, DML, DQL, Joins, Aggregates)
-- ============================================================================

-- 1. DDL Demonstration (CREATE, ALTER, DROP on temporary audit snapshot table)
CREATE TABLE IF NOT EXISTS club_analytics_snapshot (
  snapshot_id SERIAL PRIMARY KEY,
  club_id TEXT NOT NULL,
  total_events INTEGER NOT NULL DEFAULT 0,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE club_analytics_snapshot
  ADD COLUMN IF NOT EXISTS notes TEXT;

DROP TABLE IF EXISTS club_analytics_snapshot;

-- 2. INNER JOIN + GROUP BY + HAVING + ORDER BY + COUNT + SUM + AVG
-- Finds active clubs with above-average event participation and >= 1 upcoming event
SELECT
  c.club_id,
  c.name AS club_name,
  c.category,
  COUNT(e.event_id)::INT AS event_count,
  COALESCE(SUM(e.current_registrations), 0)::INT AS total_registrations,
  ROUND(AVG(e.max_capacity), 1) AS avg_capacity
FROM clubs c
INNER JOIN events e ON e.club_id = c.club_id
WHERE c.status = 'ACTIVE'
GROUP BY c.club_id, c.name, c.category
HAVING COUNT(e.event_id) >= 1
ORDER BY total_registrations DESC, event_count DESC;

-- 3. LEFT JOIN + Subquery: Clubs matching student's interests that student has NOT bookmarked yet
/*
SELECT
  c.club_id,
  c.name,
  c.category,
  COUNT(ci.interest_id)::INT AS matched_interests
FROM clubs c
INNER JOIN club_interests ci ON ci.club_id = c.club_id
INNER JOIN student_interests si ON si.interest_id = ci.interest_id
LEFT JOIN bookmarked_clubs bc ON bc.club_id = c.club_id AND bc.student_id = si.student_id
WHERE si.student_id = $1
  AND bc.club_id IS NULL
  AND c.status = 'ACTIVE'
GROUP BY c.club_id, c.name, c.category
ORDER BY matched_interests DESC, c.name ASC;
*/

-- 4. Scalar & Correlated Subquery: Events whose fill rate exceeds the average fill rate across all upcoming events
SELECT
  e.event_id,
  e.title,
  e.current_registrations,
  e.max_capacity,
  ROUND((e.current_registrations::NUMERIC / e.max_capacity) * 100, 1) AS fill_pct
FROM events e
WHERE e.status = 'UPCOMING'
  AND (e.current_registrations::NUMERIC / NULLIF(e.max_capacity, 0)) >= (
    SELECT COALESCE(AVG(e2.current_registrations::NUMERIC / NULLIF(e2.max_capacity, 0)), 0)
    FROM events e2
    WHERE e2.status = 'UPCOMING'
  )
ORDER BY fill_pct DESC;
