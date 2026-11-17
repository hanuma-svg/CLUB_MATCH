# ClubMatch — Smart College Club & Event Recommendation Platform

> **"Find Your People. Discover Your Passion."**  
> A DBMS Level 3 full-stack application built with **Next.js (App Router)**, **TypeScript**, **Tailwind CSS**, **Prisma ORM**, **PostgreSQL**, and **pgvector**.

---

## 1. Overview & Problem Statement
Students often struggle to discover relevant campus clubs, research labs, and events when information is scattered across informal channels. **ClubMatch** centralizes club discovery for PES University EC Campus, personalizes club & event recommendations using **PostgreSQL + pgvector** cosine similarity, and protects event seat reservations with **ACID transactions (`SELECT ... FOR UPDATE`)**.

> **Data Attribution Note:** Initial club names and categories are seeded from the [PESUfy EC Campus Clubs directory](https://pesufy.netlify.app/docs/ec-campus/clubs/) strictly as reference data. Unverified descriptions and demo events are clearly labeled as sample content.

---

## 2. Key Features
- **3 Role-Based Portals:**
  - **Student:** Register, select 25+ interests, explore 41 seeded PESU EC Campus clubs & research centers, receive personalized recommendations, bookmark clubs, register/cancel events atomically, and view registration history.
  - **Club Coordinator:** Scoped strictly to assigned clubs—edit club details, create/edit/cancel events, manage capacities, and mark student attendance.
  - **Admin:** Full governance over clubs (including approval queue), coordinators, user roles, interests, activity logs, batch pgvector embedding sync, and a live **DBMS & pgvector Inspector**.
- **Dual Search Engine:** Keyword search (PostgreSQL filtering & GIN full-text indexes) and Semantic search (`pgvector` `<=>` cosine distance with HNSW index).
- **Light & Dark Themes:** Modern deep purple, indigo, and electric blue aesthetic.

---

## 3. Technology Stack
- **Frontend:** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, Lucide Icons
- **Backend:** Next.js Route Handlers (`app/api/**`), Zod validation
- **Auth:** Auth.js / NextAuth v5 (Credentials + JWT), `bcryptjs`
- **Database & ORM:** PostgreSQL + `pgvector` extension + Prisma ORM

---

## 4. Database Design & Advanced DBMS Features
- **15 Normalized Tables (3NF):** `user_accounts`, `students`, `admins`, `club_coordinators`, `clubs`, `event_categories`, `events`, `interests`, `student_interests`, `club_interests`, `event_registrations`, `club_memberships`, `bookmarked_clubs`, `club_coordinator_assignments`, `resource_activities`.
- **Advanced DBMS Features (`database/sql/`):**
  - **Transactions:** `FOR UPDATE` row-level locking on event registration & cancellation.
  - **Views:** `v_popular_clubs`, `v_event_registration_stats`, `v_club_event_summary`, `v_student_registration_summary`.
  - **Triggers:** Automatic `updated_at`, registration count synchronization + audit logging, club member sync, and club status change logs.
  - **Indexing:** B-Tree indexes, GIN full-text indexes, and pgvector HNSW cosine indexes (`vector_cosine_ops`).
  - **Semantic Search (`pgvector`):** `vector(768)` embeddings with cosine similarity (`1 - (embedding <=> query_vector)`).

See full architecture & ER diagrams in [`docs/ACADEMIC_DOCUMENTATION.md`](docs/ACADEMIC_DOCUMENTATION.md).

---

## 5. Installation & Local Setup

### Prerequisites
- **Node.js 20+** and **npm**
- **PostgreSQL 15+** with the **`pgvector`** extension installed

### Step 1: Clone & Install Dependencies
```bash
git clone <your-repo-url>
cd clubmatch
npm install
```

### Step 2: Configure PostgreSQL & pgvector
Create a database named `clubmatch` and enable `pgvector`:
```sql
CREATE DATABASE clubmatch;
\c clubmatch
CREATE EXTENSION IF NOT EXISTS vector;
```

> **Windows PostgreSQL 18 Users:** If `CREATE EXTENSION vector` reports that `vector.control` is missing, run the included elevated setup script from an **Administrator PowerShell** prompt:
> ```powershell
> powershell -ExecutionPolicy Bypass -File .\scripts\install-pgvector-win.ps1
> ```

### Step 3: Configure Environment Variables
```bash
cp .env.example .env
```
Update `DATABASE_URL`, `AUTH_SECRET`, and optionally set `GEMINI_API_KEY` (or `OPENAI_API_KEY` / `OLLAMA_BASE_URL`) for semantic `pgvector` embeddings.

### Step 4: Prisma Schema, Views, Triggers & Seed Data
```bash
npx prisma generate
npx prisma db push
npm run db:setup-sql
npm run db:seed
```
*(Optional, when an embedding API key is configured)* Generate 768-d `pgvector` embeddings:
```bash
npm run db:embeddings
```

### Step 5: Run the Application
```bash
npm run dev
```
Open `http://localhost:3000`.

### Seeded Demo Accounts (Academic Evaluation)
- **Student:** `student@clubmatch.pes.edu` / `Student@ClubMatch2026!`
- **Coordinator:** `coordinator@clubmatch.pes.edu` / `Coord@ClubMatch2026!`
- **Admin:** `admin@clubmatch.pes.edu` / `Admin@ClubMatch2026!`

---

## 6. Testing & Verification Commands
```bash
npm run typecheck   # TypeScript verification
npm run lint        # ESLint verification
npm test            # Vitest suite (PostgreSQL + pgvector + security tests)
npm run build       # Production Next.js build
```
