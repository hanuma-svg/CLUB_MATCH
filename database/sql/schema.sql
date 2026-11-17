-- ============================================================================
-- ClubMatch PostgreSQL + pgvector DDL Schema
-- Normalized 3NF Relational Schema with Vector Embeddings
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS vector;

-- Custom ENUM types
DO $$ BEGIN
  CREATE TYPE "UserRole" AS ENUM ('STUDENT', 'CLUB_COORDINATOR', 'ADMIN');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "ClubCategory" AS ENUM ('TECHNICAL', 'NON_TECHNICAL', 'CULTURAL', 'RESEARCH_CENTER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "ClubStatus" AS ENUM ('PENDING', 'ACTIVE', 'INACTIVE', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "InterestCategory" AS ENUM ('TECHNOLOGY', 'CREATIVE', 'CULTURAL', 'OTHER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "EventStatus" AS ENUM ('UPCOMING', 'ONGOING', 'COMPLETED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "RegistrationStatus" AS ENUM ('REGISTERED', 'CANCELLED', 'ATTENDED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 1. USER_ACCOUNTS (Authentication & RBAC supertype)
CREATE TABLE IF NOT EXISTS user_accounts (
  user_id       TEXT PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name     TEXT NOT NULL,
  role          "UserRole" NOT NULL DEFAULT 'STUDENT',
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. STUDENTS
CREATE TABLE IF NOT EXISTS students (
  student_id           TEXT PRIMARY KEY,
  user_id              TEXT NOT NULL UNIQUE REFERENCES user_accounts(user_id) ON DELETE CASCADE,
  email                TEXT NOT NULL UNIQUE,
  srn                  TEXT UNIQUE,
  department           TEXT,
  semester             INTEGER CHECK (semester IS NULL OR (semester >= 1 AND semester <= 8)),
  campus               TEXT NOT NULL DEFAULT 'PES University EC Campus',
  bio                  TEXT,
  onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
  interest_embedding   vector(768),
  embedding_model      TEXT,
  embedding_updated_at TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. ADMINS
CREATE TABLE IF NOT EXISTS admins (
  admin_id    TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL UNIQUE REFERENCES user_accounts(user_id) ON DELETE CASCADE,
  email       TEXT NOT NULL UNIQUE,
  designation TEXT NOT NULL DEFAULT 'Platform Administrator',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. CLUB_COORDINATORS
CREATE TABLE IF NOT EXISTS club_coordinators (
  coordinator_id TEXT PRIMARY KEY,
  user_id        TEXT NOT NULL UNIQUE REFERENCES user_accounts(user_id) ON DELETE CASCADE,
  email          TEXT NOT NULL UNIQUE,
  department     TEXT,
  phone          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. CLUBS
CREATE TABLE IF NOT EXISTS clubs (
  club_id                   TEXT PRIMARY KEY,
  slug                      TEXT NOT NULL UNIQUE,
  name                      TEXT NOT NULL UNIQUE,
  category                  "ClubCategory" NOT NULL,
  campus                    TEXT NOT NULL DEFAULT 'PES University EC Campus',
  tagline                   TEXT,
  description               TEXT NOT NULL,
  activities                TEXT NOT NULL,
  logo_url                  TEXT,
  banner_url                TEXT,
  is_sample_description     BOOLEAN NOT NULL DEFAULT TRUE,
  verified_coordinator_name TEXT,
  verified_email            TEXT,
  verified_social_links     JSONB,
  status                    "ClubStatus" NOT NULL DEFAULT 'ACTIVE',
  is_featured               BOOLEAN NOT NULL DEFAULT FALSE,
  member_count              INTEGER NOT NULL DEFAULT 0 CHECK (member_count >= 0),
  admin_id                  TEXT REFERENCES admins(admin_id) ON DELETE SET NULL,
  embedding                 vector(768),
  embedding_text            TEXT,
  embedding_model           TEXT,
  embedding_updated_at      TIMESTAMPTZ,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. EVENT_CATEGORIES
CREATE TABLE IF NOT EXISTS event_categories (
  category_id TEXT PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,
  slug        TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. EVENTS
CREATE TABLE IF NOT EXISTS events (
  event_id              TEXT PRIMARY KEY,
  slug                  TEXT NOT NULL UNIQUE,
  title                 TEXT NOT NULL,
  description           TEXT NOT NULL,
  banner_url            TEXT,
  club_id               TEXT NOT NULL REFERENCES clubs(club_id) ON DELETE CASCADE,
  category_id           TEXT NOT NULL REFERENCES event_categories(category_id) ON DELETE RESTRICT,
  event_date            TIMESTAMPTZ NOT NULL,
  start_time            TEXT NOT NULL,
  end_time              TEXT NOT NULL,
  venue                 TEXT NOT NULL,
  registration_deadline TIMESTAMPTZ NOT NULL,
  max_capacity          INTEGER NOT NULL CHECK (max_capacity > 0),
  current_registrations INTEGER NOT NULL DEFAULT 0 CHECK (current_registrations >= 0 AND current_registrations <= max_capacity),
  status                "EventStatus" NOT NULL DEFAULT 'UPCOMING',
  is_featured           BOOLEAN NOT NULL DEFAULT FALSE,
  is_sample_event       BOOLEAN NOT NULL DEFAULT FALSE,
  embedding             vector(768),
  embedding_text        TEXT,
  embedding_model       TEXT,
  embedding_updated_at  TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_event_deadline CHECK (registration_deadline <= event_date)
);

-- 8. INTERESTS
CREATE TABLE IF NOT EXISTS interests (
  interest_id   TEXT PRIMARY KEY,
  interest_name TEXT NOT NULL UNIQUE,
  slug          TEXT NOT NULL UNIQUE,
  category      "InterestCategory" NOT NULL,
  description   TEXT,
  icon_name     TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. STUDENT_INTERESTS (M:N Junction Table with Composite PK)
CREATE TABLE IF NOT EXISTS student_interests (
  student_id  TEXT NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
  interest_id TEXT NOT NULL REFERENCES interests(interest_id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (student_id, interest_id)
);

-- 10. CLUB_INTERESTS (M:N Junction Table with Composite PK)
CREATE TABLE IF NOT EXISTS club_interests (
  club_id     TEXT NOT NULL REFERENCES clubs(club_id) ON DELETE CASCADE,
  interest_id TEXT NOT NULL REFERENCES interests(interest_id) ON DELETE CASCADE,
  weight      INTEGER NOT NULL DEFAULT 1 CHECK (weight >= 1 AND weight <= 10),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (club_id, interest_id)
);

-- 11. EVENT_REGISTRATIONS (M:N Junction with UNIQUE(student_id, event_id))
CREATE TABLE IF NOT EXISTS event_registrations (
  registration_id TEXT PRIMARY KEY,
  student_id      TEXT NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
  event_id        TEXT NOT NULL REFERENCES events(event_id) ON DELETE CASCADE,
  status          "RegistrationStatus" NOT NULL DEFAULT 'REGISTERED',
  notes           TEXT,
  registered_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cancelled_at    TIMESTAMPTZ,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_student_event_registration UNIQUE (student_id, event_id)
);

-- 12. CLUB_MEMBERSHIPS (Composite PK)
CREATE TABLE IF NOT EXISTS club_memberships (
  student_id TEXT NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
  club_id    TEXT NOT NULL REFERENCES clubs(club_id) ON DELETE CASCADE,
  role       TEXT NOT NULL DEFAULT 'Member',
  status     TEXT NOT NULL DEFAULT 'ACTIVE',
  joined_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (student_id, club_id)
);

-- 13. BOOKMARKED_CLUBS (Composite PK)
CREATE TABLE IF NOT EXISTS bookmarked_clubs (
  student_id TEXT NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
  club_id    TEXT NOT NULL REFERENCES clubs(club_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (student_id, club_id)
);

-- 14. CLUB_COORDINATOR_ASSIGNMENTS (Composite PK)
CREATE TABLE IF NOT EXISTS club_coordinator_assignments (
  coordinator_id      TEXT NOT NULL REFERENCES club_coordinators(coordinator_id) ON DELETE CASCADE,
  club_id             TEXT NOT NULL REFERENCES clubs(club_id) ON DELETE CASCADE,
  assigned_by_admin_id TEXT REFERENCES admins(admin_id) ON DELETE SET NULL,
  title               TEXT NOT NULL DEFAULT 'Club Coordinator',
  assigned_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (coordinator_id, club_id)
);

-- 15. RESOURCE_ACTIVITIES (Audit & DBMS Activity Log)
CREATE TABLE IF NOT EXISTS resource_activities (
  activity_id   TEXT PRIMARY KEY,
  actor_user_id TEXT REFERENCES user_accounts(user_id) ON DELETE SET NULL,
  actor_role    TEXT NOT NULL,
  action        TEXT NOT NULL,
  entity_type   TEXT NOT NULL,
  entity_id     TEXT NOT NULL,
  summary       TEXT NOT NULL,
  metadata      JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enforce DB-level CHECK constraints idempotently when tables are created via Prisma
ALTER TABLE students DROP CONSTRAINT IF EXISTS chk_students_semester;
ALTER TABLE students ADD CONSTRAINT chk_students_semester CHECK (semester IS NULL OR (semester >= 1 AND semester <= 8));

ALTER TABLE events DROP CONSTRAINT IF EXISTS chk_events_capacity;
ALTER TABLE events ADD CONSTRAINT chk_events_capacity CHECK (max_capacity > 0 AND current_registrations >= 0 AND current_registrations <= max_capacity);

ALTER TABLE events DROP CONSTRAINT IF EXISTS chk_events_deadline;
ALTER TABLE events ADD CONSTRAINT chk_events_deadline CHECK (registration_deadline <= event_date);
