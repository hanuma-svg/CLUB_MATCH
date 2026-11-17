-- ============================================================================
-- ClubMatch Relational, Full-Text & pgvector HNSW Indexes
-- ============================================================================

-- Relational B-Tree Indexes
CREATE INDEX IF NOT EXISTS idx_user_accounts_email ON user_accounts (email);
CREATE INDEX IF NOT EXISTS idx_students_email ON students (email);
CREATE INDEX IF NOT EXISTS idx_clubs_name ON clubs (name);
CREATE INDEX IF NOT EXISTS idx_clubs_category_status ON clubs (category, status);
CREATE INDEX IF NOT EXISTS idx_events_event_date ON events (event_date);
CREATE INDEX IF NOT EXISTS idx_events_category_id ON events (category_id);
CREATE INDEX IF NOT EXISTS idx_events_club_id_status ON events (club_id, status);
CREATE INDEX IF NOT EXISTS idx_event_reg_student_status ON event_registrations (student_id, status);
CREATE INDEX IF NOT EXISTS idx_event_reg_event_status ON event_registrations (event_id, status);
CREATE INDEX IF NOT EXISTS idx_student_interests_interest ON student_interests (interest_id);
CREATE INDEX IF NOT EXISTS idx_club_interests_interest ON club_interests (interest_id);

-- Full-Text Search GIN Indexes (Keyword Search)
CREATE INDEX IF NOT EXISTS idx_clubs_fts
  ON clubs USING GIN (to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, '') || ' ' || coalesce(activities, '')));

CREATE INDEX IF NOT EXISTS idx_events_fts
  ON events USING GIN (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, '') || ' ' || coalesce(venue, '')));

-- pgvector HNSW Cosine Distance Indexes (Semantic Similarity Search)
CREATE INDEX IF NOT EXISTS idx_clubs_embedding_hnsw
  ON clubs USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

CREATE INDEX IF NOT EXISTS idx_events_embedding_hnsw
  ON events USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
