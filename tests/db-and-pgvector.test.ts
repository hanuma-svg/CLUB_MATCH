import fs from "node:fs";
import path from "node:path";
import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { vector } from "@electric-sql/pglite/vector";

describe("PostgreSQL + pgvector DBMS Level 3 Verification", () => {
  let db: PGlite;

  beforeAll(async () => {
    db = new PGlite({
      extensions: { vector },
    });
    await db.waitReady;

    // Apply actual project SQL files
    const sqlDir = path.join(process.cwd(), "database", "sql");
    const schemaSql = fs.readFileSync(path.join(sqlDir, "schema.sql"), "utf8");
    const viewsSql = fs.readFileSync(path.join(sqlDir, "views.sql"), "utf8");
    const triggersSql = fs.readFileSync(path.join(sqlDir, "triggers.sql"), "utf8");
    const indexesSql = fs.readFileSync(path.join(sqlDir, "indexes.sql"), "utf8");

    await db.exec(schemaSql);
    await db.exec(viewsSql);
    await db.exec(triggersSql);
    await db.exec(indexesSql);

    // Insert test fixtures
    await db.exec(`
      INSERT INTO user_accounts (user_id, email, password_hash, full_name, role) VALUES
        ('u_admin', 'admin@test.edu', 'hash', 'Admin', 'ADMIN'),
        ('u_stu1', 'stu1@test.edu', 'hash', 'Student One', 'STUDENT'),
        ('u_stu2', 'stu2@test.edu', 'hash', 'Student Two', 'STUDENT');

      INSERT INTO admins (admin_id, user_id, email) VALUES
        ('adm1', 'u_admin', 'admin@test.edu');

      INSERT INTO students (student_id, user_id, email, srn, department, semester) VALUES
        ('stu1', 'u_stu1', 'stu1@test.edu', 'PES2UG24CS001', 'CSE', 4),
        ('stu2', 'u_stu2', 'stu2@test.edu', 'PES2UG24CS002', 'ECE', 2);

      INSERT INTO interests (interest_id, interest_name, slug, category) VALUES
        ('int_ai', 'Artificial Intelligence', 'artificial-intelligence', 'TECHNOLOGY'),
        ('int_sec', 'Cybersecurity', 'cybersecurity', 'TECHNOLOGY'),
        ('int_dance', 'Dance', 'dance', 'CULTURAL');

      INSERT INTO clubs (club_id, slug, name, category, description, activities, admin_id, member_count) VALUES
        ('club_neural', 'neuralhive', 'NeuralHive', 'TECHNICAL', 'Sample AI club', 'ML workshops', 'adm1', 50),
        ('club_layer8', 'layer8', 'Layer8', 'TECHNICAL', 'Sample Security club', 'CTF labs', 'adm1', 40),
        ('club_dance', 'terpsichore', 'Terpsichore', 'CULTURAL', 'Sample Dance club', 'Dance choreography', 'adm1', 60);

      INSERT INTO club_interests (club_id, interest_id, weight) VALUES
        ('club_neural', 'int_ai', 2),
        ('club_layer8', 'int_sec', 2),
        ('club_dance', 'int_dance', 2);

      INSERT INTO student_interests (student_id, interest_id) VALUES
        ('stu1', 'int_ai'),
        ('stu1', 'int_sec');

      INSERT INTO event_categories (category_id, name, slug) VALUES
        ('cat_tech', 'Technical', 'technical');

      INSERT INTO events (
        event_id, slug, title, description, club_id, category_id,
        event_date, start_time, end_time, venue, registration_deadline, max_capacity
      ) VALUES (
        'ev_1', 'ai-lab', 'AI Vector Lab', 'Hands-on pgvector', 'club_neural', 'cat_tech',
        NOW() + INTERVAL '5 days', '14:00', '16:00', 'Hall 1', NOW() + INTERVAL '4 days', 1
      );
    `);
  });

  afterAll(async () => {
    await db.close();
  });

  it("enforces CHECK constraints on semester, deadline, and capacity", async () => {
    await expect(
      db.query(`
        INSERT INTO students (student_id, user_id, email, semester)
        VALUES ('stu_bad', 'u_stu1', 'bad@test.edu', 12)
      `)
    ).rejects.toThrow();

    await expect(
      db.query(`
        INSERT INTO events (
          event_id, slug, title, description, club_id, category_id,
          event_date, start_time, end_time, venue, registration_deadline, max_capacity
        ) VALUES (
          'ev_bad', 'bad', 'Bad Event', 'Invalid deadline', 'club_neural', 'cat_tech',
          NOW() + INTERVAL '2 days', '10:00', '12:00', 'Hall', NOW() + INTERVAL '5 days', 10
        )
      `)
    ).rejects.toThrow();
  });

  it("fires triggers on registration insert, prevents duplicate registration, and enforces capacity", async () => {
    await db.query(`
      INSERT INTO event_registrations (registration_id, student_id, event_id, status)
      VALUES ('reg_1', 'stu1', 'ev_1', 'REGISTERED')
    `);

    const evRes = await db.query<{ current_registrations: number }>(
      `SELECT current_registrations FROM events WHERE event_id = 'ev_1'`
    );
    expect(evRes.rows[0].current_registrations).toBe(1);

    // Audit trigger recorded activity
    const actRes = await db.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM resource_activities WHERE entity_id = 'ev_1'`
    );
    expect(Number(actRes.rows[0].count)).toBeGreaterThanOrEqual(1);

    // Duplicate registration violates UNIQUE(student_id, event_id)
    await expect(
      db.query(`
        INSERT INTO event_registrations (registration_id, student_id, event_id, status)
        VALUES ('reg_dup', 'stu1', 'ev_1', 'REGISTERED')
      `)
    ).rejects.toThrow();

    // Exceeding capacity violates CHECK (current_registrations <= max_capacity)
    await expect(
      db.query(`UPDATE events SET current_registrations = 999 WHERE event_id = 'ev_1'`)
    ).rejects.toThrow();
  });

  it("supports ACID transaction rollback cleanly", async () => {
    await db.query("BEGIN");
    await db.query(`
      INSERT INTO bookmarked_clubs (student_id, club_id) VALUES ('stu2', 'club_layer8')
    `);
    await db.query("ROLLBACK");

    const check = await db.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM bookmarked_clubs WHERE student_id = 'stu2' AND club_id = 'club_layer8'`
    );
    expect(Number(check.rows[0].count)).toBe(0);
  });

  it("executes SQL views and advanced GROUP BY / HAVING / subquery queries", async () => {
    const viewRes = await db.query<{ name: string; total_events: number }>(
      `SELECT name, total_events FROM v_popular_clubs WHERE club_id = 'club_neural'`
    );
    expect(viewRes.rows[0].name).toBe("NeuralHive");
    expect(viewRes.rows[0].total_events).toBe(1);

    const statsView = await db.query<{ title: string; remaining_seats: number }>(
      `SELECT title, remaining_seats FROM v_event_registration_stats WHERE event_id = 'ev_1'`
    );
    expect(statsView.rows[0].remaining_seats).toBe(0);

    const advSql = fs.readFileSync(
      path.join(process.cwd(), "database", "sql", "advanced_queries.sql"),
      "utf8"
    );
    await expect(db.exec(advSql)).resolves.not.toThrow();
  });

  it("performs real pgvector cosine similarity (<=>) ranking", async () => {
    const unitVec = (idx: number) => {
      const arr = new Array(768).fill(0);
      arr[idx] = 1;
      return `[${arr.join(",")}]`;
    };

    // Student vector aligned along axis 0 (AI), Club NeuralHive aligned along axis 0,
    // Club Layer8 partially aligned (0.7, 0.7), Club Dance orthogonal (axis 2)
    const partialArr = new Array(768).fill(0);
    partialArr[0] = 0.7;
    partialArr[1] = 0.714;
    const partialVec = `[${partialArr.join(",")}]`;

    await db.query(`UPDATE students SET interest_embedding = $1::vector(768) WHERE student_id = 'stu1'`, [
      unitVec(0),
    ]);
    await db.query(`UPDATE clubs SET embedding = $1::vector(768) WHERE club_id = 'club_neural'`, [
      unitVec(0),
    ]);
    await db.query(`UPDATE clubs SET embedding = $1::vector(768) WHERE club_id = 'club_layer8'`, [
      partialVec,
    ]);
    await db.query(`UPDATE clubs SET embedding = $1::vector(768) WHERE club_id = 'club_dance'`, [
      unitVec(2),
    ]);

    const ranked = await db.query<{ name: string; similarity: number }>(
      `
      SELECT c.name, (1 - (c.embedding <=> s.interest_embedding))::float AS similarity
      FROM clubs c
      CROSS JOIN students s
      WHERE s.student_id = 'stu1' AND c.embedding IS NOT NULL
      ORDER BY c.embedding <=> s.interest_embedding ASC
      `
    );

    expect(ranked.rows.map((r) => r.name)).toEqual(["NeuralHive", "Layer8", "Terpsichore"]);
    expect(ranked.rows[0].similarity).toBeCloseTo(1, 4);
    expect(ranked.rows[2].similarity).toBeCloseTo(0, 4);
  });
});
