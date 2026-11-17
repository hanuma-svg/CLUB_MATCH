-- ============================================================================
-- ClubMatch SQL Views (Advanced DBMS Feature)
-- ============================================================================

-- 1. Popular Clubs View (combines bookmarks, memberships, events, registrations)
CREATE OR REPLACE VIEW v_popular_clubs AS
SELECT
  c.club_id,
  c.slug,
  c.name,
  c.category,
  c.campus,
  c.status,
  c.is_featured,
  c.member_count,
  COUNT(DISTINCT bc.student_id)::INT AS bookmark_count,
  COUNT(DISTINCT e.event_id)::INT AS total_events,
  COALESCE(SUM(CASE WHEN er.status = 'REGISTERED' OR er.status = 'ATTENDED' THEN 1 ELSE 0 END), 0)::INT AS total_event_registrations,
  (
    c.member_count * 2
    + COUNT(DISTINCT bc.student_id) * 3
    + COALESCE(SUM(CASE WHEN er.status = 'REGISTERED' OR er.status = 'ATTENDED' THEN 1 ELSE 0 END), 0)
  )::INT AS engagement_score
FROM clubs c
LEFT JOIN bookmarked_clubs bc ON bc.club_id = c.club_id
LEFT JOIN events e ON e.club_id = c.club_id
LEFT JOIN event_registrations er ON er.event_id = e.event_id
WHERE c.status = 'ACTIVE'
GROUP BY c.club_id
ORDER BY engagement_score DESC, c.member_count DESC, c.name ASC;

-- 2. Event Registration Statistics View
CREATE OR REPLACE VIEW v_event_registration_stats AS
SELECT
  e.event_id,
  e.slug,
  e.title,
  e.club_id,
  c.name AS club_name,
  ec.name AS category_name,
  e.event_date,
  e.venue,
  e.status,
  e.max_capacity,
  e.current_registrations,
  (e.max_capacity - e.current_registrations)::INT AS remaining_seats,
  ROUND((e.current_registrations::NUMERIC / NULLIF(e.max_capacity, 0)) * 100, 1) AS fill_percentage,
  COUNT(CASE WHEN er.status = 'REGISTERED' THEN 1 END)::INT AS active_registrations,
  COUNT(CASE WHEN er.status = 'CANCELLED' THEN 1 END)::INT AS cancelled_registrations,
  COUNT(CASE WHEN er.status = 'ATTENDED' THEN 1 END)::INT AS attended_registrations
FROM events e
INNER JOIN clubs c ON c.club_id = e.club_id
INNER JOIN event_categories ec ON ec.category_id = e.category_id
LEFT JOIN event_registrations er ON er.event_id = e.event_id
GROUP BY e.event_id, c.name, ec.name;

-- 3. Club-Wise Event Summary View
CREATE OR REPLACE VIEW v_club_event_summary AS
SELECT
  c.club_id,
  c.name AS club_name,
  c.category,
  COUNT(e.event_id)::INT AS total_events,
  COUNT(CASE WHEN e.status = 'UPCOMING' THEN 1 END)::INT AS upcoming_events,
  COUNT(CASE WHEN e.status = 'COMPLETED' THEN 1 END)::INT AS completed_events,
  COUNT(CASE WHEN e.status = 'CANCELLED' THEN 1 END)::INT AS cancelled_events,
  COALESCE(SUM(e.max_capacity), 0)::INT AS total_capacity_offered,
  COALESCE(SUM(e.current_registrations), 0)::INT AS total_registrations_received,
  COALESCE(ROUND(AVG(
    CASE WHEN e.max_capacity > 0 THEN (e.current_registrations::NUMERIC / e.max_capacity) * 100 ELSE 0 END
  ), 1), 0) AS avg_fill_rate_pct
FROM clubs c
LEFT JOIN events e ON e.club_id = c.club_id
GROUP BY c.club_id, c.name, c.category;

-- 4. Student Registration & Engagement Summary View
CREATE OR REPLACE VIEW v_student_registration_summary AS
SELECT
  s.student_id,
  ua.full_name,
  s.email,
  s.department,
  s.semester,
  COUNT(DISTINCT si.interest_id)::INT AS interest_count,
  COUNT(DISTINCT bc.club_id)::INT AS bookmarked_clubs_count,
  COUNT(DISTINCT cm.club_id)::INT AS club_memberships_count,
  COUNT(DISTINCT CASE WHEN er.status = 'REGISTERED' THEN er.registration_id END)::INT AS active_registrations_count,
  COUNT(DISTINCT CASE WHEN er.status = 'CANCELLED' THEN er.registration_id END)::INT AS cancelled_registrations_count,
  COUNT(DISTINCT CASE WHEN er.status = 'ATTENDED' THEN er.registration_id END)::INT AS attended_events_count
FROM students s
INNER JOIN user_accounts ua ON ua.user_id = s.user_id
LEFT JOIN student_interests si ON si.student_id = s.student_id
LEFT JOIN bookmarked_clubs bc ON bc.student_id = s.student_id
LEFT JOIN club_memberships cm ON cm.student_id = s.student_id
LEFT JOIN event_registrations er ON er.student_id = s.student_id
GROUP BY s.student_id, ua.full_name, s.email, s.department, s.semester;
