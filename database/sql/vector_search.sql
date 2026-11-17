-- ============================================================================
-- ClubMatch pgvector Semantic Similarity Search Queries
-- Cosine Distance Operator: <=> (range 0..2, similarity = 1 - distance)
-- ============================================================================

-- 1. Personalized Club Recommendations for a Student
/*
SELECT
  c.club_id,
  c.slug,
  c.name,
  c.category,
  c.tagline,
  c.description,
  1 - (c.embedding <=> s.interest_embedding) AS similarity_score
FROM clubs c
CROSS JOIN students s
WHERE s.student_id = $1
  AND s.interest_embedding IS NOT NULL
  AND c.embedding IS NOT NULL
  AND c.status = 'ACTIVE'
ORDER BY c.embedding <=> s.interest_embedding ASC
LIMIT 10;
*/

-- 2. Personalized Event Recommendations for a Student
/*
SELECT
  e.event_id,
  e.slug,
  e.title,
  e.event_date,
  e.venue,
  c.name AS club_name,
  1 - (e.embedding <=> s.interest_embedding) AS similarity_score
FROM events e
INNER JOIN clubs c ON c.club_id = e.club_id
CROSS JOIN students s
WHERE s.student_id = $1
  AND s.interest_embedding IS NOT NULL
  AND e.embedding IS NOT NULL
  AND e.status = 'UPCOMING'
ORDER BY e.embedding <=> s.interest_embedding ASC
LIMIT 10;
*/

-- 3. Similar Communities (Clubs similar to a given Club)
/*
SELECT
  c2.club_id,
  c2.slug,
  c2.name,
  c2.category,
  1 - (c2.embedding <=> c1.embedding) AS similarity_score
FROM clubs c1
JOIN clubs c2 ON c1.club_id <> c2.club_id
WHERE c1.club_id = $1
  AND c1.embedding IS NOT NULL
  AND c2.embedding IS NOT NULL
  AND c2.status = 'ACTIVE'
ORDER BY c2.embedding <=> c1.embedding ASC
LIMIT 5;
*/

-- 4. Free-Text Semantic Search Query
/*
SELECT
  c.club_id,
  c.name,
  c.category,
  1 - (c.embedding <=> $1::vector(768)) AS similarity_score
FROM clubs c
WHERE c.embedding IS NOT NULL
  AND c.status = 'ACTIVE'
ORDER BY c.embedding <=> $1::vector(768) ASC
LIMIT 12;
*/
