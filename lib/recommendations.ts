import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  buildClubEmbeddingText,
  buildEventEmbeddingText,
  buildStudentInterestText,
  formatVectorLiteral,
  generateEmbedding,
  getEmbeddingStatus,
} from "@/lib/embeddings";

export type RecommendationMode = "pgvector_cosine" | "interest_overlap_fallback";

export interface RecommendedClubItem {
  clubId: string;
  slug: string;
  name: string;
  category: string;
  campus: string;
  tagline: string | null;
  description: string;
  activities: string;
  isSampleDescription: boolean;
  memberCount: number;
  isFeatured: boolean;
  similarityScore: number | null;
  matchedInterests: string[];
  mode: RecommendationMode;
}

export interface RecommendedEventItem {
  eventId: string;
  slug: string;
  title: string;
  description: string;
  clubId: string;
  clubName: string;
  clubSlug: string;
  categoryName: string;
  eventDate: Date;
  startTime: string;
  endTime: string;
  venue: string;
  maxCapacity: number;
  currentRegistrations: number;
  status: string;
  isSampleEvent: boolean;
  similarityScore: number | null;
  matchedInterests: string[];
  mode: RecommendationMode;
}

export interface RecommendationResponse<T> {
  mode: RecommendationMode;
  semanticAvailable: boolean;
  embeddingProvider: string | null;
  embeddingModel: string | null;
  notice?: string;
  items: T[];
}

export async function syncStudentEmbedding(studentId: string): Promise<{
  synced: boolean;
  model: string | null;
  reason?: string;
}> {
  const student = await prisma.student.findUnique({
    where: { studentId },
    include: {
      interests: { include: { interest: true } },
    },
  });

  if (!student || student.interests.length === 0) {
    return { synced: false, model: null, reason: "Student has no selected interests yet." };
  }

  const text = buildStudentInterestText(
    student.interests.map((si) => ({
      name: si.interest.name,
      category: si.interest.category,
    })),
    student.bio
  );

  const result = await generateEmbedding(text);
  if (!result.available || !result.embedding) {
    return { synced: false, model: result.model, reason: result.error };
  }

  const vectorLiteral = formatVectorLiteral(result.embedding);
  await prisma.$executeRaw`
    UPDATE students
    SET interest_embedding = ${vectorLiteral}::vector(768),
        embedding_model = ${result.model},
        embedding_updated_at = NOW()
    WHERE student_id = ${studentId}
  `;

  return { synced: true, model: result.model };
}

export async function syncClubEmbedding(clubId: string): Promise<{
  synced: boolean;
  model: string | null;
  reason?: string;
}> {
  const club = await prisma.club.findUnique({
    where: { clubId },
    include: { interests: { include: { interest: true } } },
  });

  if (!club) {
    return { synced: false, model: null, reason: "Club not found." };
  }

  const text = buildClubEmbeddingText({
    name: club.name,
    category: club.category,
    tagline: club.tagline,
    description: club.description,
    activities: club.activities,
    interests: club.interests.map((ci) => ci.interest.name),
  });

  const result = await generateEmbedding(text);
  if (!result.available || !result.embedding) {
    return { synced: false, model: result.model, reason: result.error };
  }

  const vectorLiteral = formatVectorLiteral(result.embedding);
  await prisma.$executeRaw`
    UPDATE clubs
    SET embedding = ${vectorLiteral}::vector(768),
        embedding_text = ${text},
        embedding_model = ${result.model},
        embedding_updated_at = NOW()
    WHERE club_id = ${clubId}
  `;

  return { synced: true, model: result.model };
}

export async function syncEventEmbedding(eventId: string): Promise<{
  synced: boolean;
  model: string | null;
  reason?: string;
}> {
  const event = await prisma.event.findUnique({
    where: { eventId },
    include: { club: true, category: true },
  });

  if (!event) {
    return { synced: false, model: null, reason: "Event not found." };
  }

  const text = buildEventEmbeddingText({
    title: event.title,
    description: event.description,
    categoryName: event.category.name,
    clubName: event.club.name,
    venue: event.venue,
  });

  const result = await generateEmbedding(text);
  if (!result.available || !result.embedding) {
    return { synced: false, model: result.model, reason: result.error };
  }

  const vectorLiteral = formatVectorLiteral(result.embedding);
  await prisma.$executeRaw`
    UPDATE events
    SET embedding = ${vectorLiteral}::vector(768),
        embedding_text = ${text},
        embedding_model = ${result.model},
        embedding_updated_at = NOW()
    WHERE event_id = ${eventId}
  `;

  return { synced: true, model: result.model };
}

/**
 * Generates personalized club recommendations for a student.
 * Uses PostgreSQL + pgvector cosine similarity (<=>) when student & club vectors exist.
 * Falls back transparently to relational interest-overlap SQL ranking when embeddings are not configured.
 */
export async function getRecommendedClubsForStudent(
  studentId: string,
  limit = 8
): Promise<RecommendationResponse<RecommendedClubItem>> {
  const embeddingStatus = getEmbeddingStatus();

  const studentInterests = await prisma.studentInterest.findMany({
    where: { studentId },
    include: { interest: true },
  });
  const studentInterestIds = new Set(studentInterests.map((si) => si.interestId));

  // Check if pgvector embeddings exist for this student and active clubs
  const vectorCheck = await prisma.$queryRaw<
    Array<{ has_student_vec: boolean; embedded_clubs_count: bigint }>
  >`
    SELECT
      EXISTS(
        SELECT 1 FROM students WHERE student_id = ${studentId} AND interest_embedding IS NOT NULL
      ) AS has_student_vec,
      (SELECT COUNT(*) FROM clubs WHERE status = 'ACTIVE' AND embedding IS NOT NULL) AS embedded_clubs_count
  `;

  const hasStudentVec = vectorCheck[0]?.has_student_vec ?? false;
  const embeddedClubsCount = Number(vectorCheck[0]?.embedded_clubs_count ?? 0);

  if (hasStudentVec && embeddedClubsCount > 0) {
    const rows = await prisma.$queryRaw<
      Array<{
        club_id: string;
        slug: string;
        name: string;
        category: string;
        campus: string;
        tagline: string | null;
        description: string;
        activities: string;
        is_sample_description: boolean;
        member_count: number;
        is_featured: boolean;
        similarity_score: number;
      }>
    >`
      SELECT
        c.club_id,
        c.slug,
        c.name,
        c.category::text AS category,
        c.campus,
        c.tagline,
        c.description,
        c.activities,
        c.is_sample_description,
        c.member_count,
        c.is_featured,
        (1 - (c.embedding <=> s.interest_embedding))::float AS similarity_score
      FROM clubs c
      CROSS JOIN students s
      WHERE s.student_id = ${studentId}
        AND s.interest_embedding IS NOT NULL
        AND c.embedding IS NOT NULL
        AND c.status = 'ACTIVE'
      ORDER BY c.embedding <=> s.interest_embedding ASC
      LIMIT ${limit}
    `;

    const clubIds = rows.map((r) => r.club_id);
    const clubInterests = await prisma.clubInterest.findMany({
      where: { clubId: { in: clubIds } },
      include: { interest: true },
    });

    const items: RecommendedClubItem[] = rows.map((row) => ({
      clubId: row.club_id,
      slug: row.slug,
      name: row.name,
      category: row.category,
      campus: row.campus,
      tagline: row.tagline,
      description: row.description,
      activities: row.activities,
      isSampleDescription: row.is_sample_description,
      memberCount: row.member_count,
      isFeatured: row.is_featured,
      similarityScore: Math.max(0, Math.min(1, Number(row.similarity_score))),
      matchedInterests: clubInterests
        .filter((ci) => ci.clubId === row.club_id && studentInterestIds.has(ci.interestId))
        .map((ci) => ci.interest.name),
      mode: "pgvector_cosine",
    }));

    return {
      mode: "pgvector_cosine",
      semanticAvailable: true,
      embeddingProvider: embeddingStatus.provider,
      embeddingModel: embeddingStatus.model,
      items,
    };
  }

  // Transparent relational interest-overlap fallback (no fabricated vector scores)
  const clubs = await prisma.club.findMany({
    where: { status: "ACTIVE" },
    include: {
      interests: { include: { interest: true } },
    },
    orderBy: [{ isFeatured: "desc" }, { memberCount: "desc" }, { name: "asc" }],
  });

  const ranked = clubs
    .map((club) => {
      const matched = club.interests
        .filter((ci) => studentInterestIds.has(ci.interestId))
        .map((ci) => ci.interest.name);
      return { club, matched, score: matched.length };
    })
    .sort((a, b) => b.score - a.score || b.club.memberCount - a.club.memberCount)
    .slice(0, limit);

  return {
    mode: "interest_overlap_fallback",
    semanticAvailable: false,
    embeddingProvider: embeddingStatus.provider,
    embeddingModel: embeddingStatus.model,
    notice:
      embeddingStatus.reason ||
      "pgvector embeddings have not been generated yet. Showing relational interest-overlap matches until embeddings are synced.",
    items: ranked.map(({ club, matched }) => ({
      clubId: club.clubId,
      slug: club.slug,
      name: club.name,
      category: club.category,
      campus: club.campus,
      tagline: club.tagline,
      description: club.description,
      activities: club.activities,
      isSampleDescription: club.isSampleDescription,
      memberCount: club.memberCount,
      isFeatured: club.isFeatured,
      similarityScore: null,
      matchedInterests: matched,
      mode: "interest_overlap_fallback",
    })),
  };
}

/**
 * Generates personalized event recommendations for a student via pgvector cosine distance
 * or transparent relational interest-overlap fallback.
 */
export async function getRecommendedEventsForStudent(
  studentId: string,
  limit = 6
): Promise<RecommendationResponse<RecommendedEventItem>> {
  const embeddingStatus = getEmbeddingStatus();

  const studentInterests = await prisma.studentInterest.findMany({
    where: { studentId },
    include: { interest: true },
  });
  const studentInterestIds = new Set(studentInterests.map((si) => si.interestId));

  const vectorCheck = await prisma.$queryRaw<
    Array<{ has_student_vec: boolean; embedded_events_count: bigint }>
  >`
    SELECT
      EXISTS(
        SELECT 1 FROM students WHERE student_id = ${studentId} AND interest_embedding IS NOT NULL
      ) AS has_student_vec,
      (SELECT COUNT(*) FROM events WHERE status = 'UPCOMING' AND embedding IS NOT NULL) AS embedded_events_count
  `;

  const hasStudentVec = vectorCheck[0]?.has_student_vec ?? false;
  const embeddedEventsCount = Number(vectorCheck[0]?.embedded_events_count ?? 0);

  if (hasStudentVec && embeddedEventsCount > 0) {
    const rows = await prisma.$queryRaw<
      Array<{
        event_id: string;
        slug: string;
        title: string;
        description: string;
        club_id: string;
        club_name: string;
        club_slug: string;
        category_name: string;
        event_date: Date;
        start_time: string;
        end_time: string;
        venue: string;
        max_capacity: number;
        current_registrations: number;
        status: string;
        is_sample_event: boolean;
        similarity_score: number;
      }>
    >`
      SELECT
        e.event_id,
        e.slug,
        e.title,
        e.description,
        c.club_id,
        c.name AS club_name,
        c.slug AS club_slug,
        ec.name AS category_name,
        e.event_date,
        e.start_time,
        e.end_time,
        e.venue,
        e.max_capacity,
        e.current_registrations,
        e.status::text AS status,
        e.is_sample_event,
        (1 - (e.embedding <=> s.interest_embedding))::float AS similarity_score
      FROM events e
      INNER JOIN clubs c ON c.club_id = e.club_id
      INNER JOIN event_categories ec ON ec.category_id = e.category_id
      CROSS JOIN students s
      WHERE s.student_id = ${studentId}
        AND s.interest_embedding IS NOT NULL
        AND e.embedding IS NOT NULL
        AND e.status = 'UPCOMING'
      ORDER BY e.embedding <=> s.interest_embedding ASC
      LIMIT ${limit}
    `;

    const clubIds = [...new Set(rows.map((r) => r.club_id))];
    const clubInterests = await prisma.clubInterest.findMany({
      where: { clubId: { in: clubIds } },
      include: { interest: true },
    });

    return {
      mode: "pgvector_cosine",
      semanticAvailable: true,
      embeddingProvider: embeddingStatus.provider,
      embeddingModel: embeddingStatus.model,
      items: rows.map((row) => ({
        eventId: row.event_id,
        slug: row.slug,
        title: row.title,
        description: row.description,
        clubId: row.club_id,
        clubName: row.club_name,
        clubSlug: row.club_slug,
        categoryName: row.category_name,
        eventDate: row.event_date,
        startTime: row.start_time,
        endTime: row.end_time,
        venue: row.venue,
        maxCapacity: row.max_capacity,
        currentRegistrations: row.current_registrations,
        status: row.status,
        isSampleEvent: row.is_sample_event,
        similarityScore: Math.max(0, Math.min(1, Number(row.similarity_score))),
        matchedInterests: clubInterests
          .filter((ci) => ci.clubId === row.club_id && studentInterestIds.has(ci.interestId))
          .map((ci) => ci.interest.name),
        mode: "pgvector_cosine",
      })),
    };
  }

  const events = await prisma.event.findMany({
    where: { status: "UPCOMING" },
    include: {
      club: {
        include: { interests: { include: { interest: true } } },
      },
      category: true,
    },
    orderBy: [{ eventDate: "asc" }],
  });

  const ranked = events
    .map((event) => {
      const matched = event.club.interests
        .filter((ci) => studentInterestIds.has(ci.interestId))
        .map((ci) => ci.interest.name);
      return { event, matched, score: matched.length };
    })
    .sort((a, b) => b.score - a.score || a.event.eventDate.getTime() - b.event.eventDate.getTime())
    .slice(0, limit);

  return {
    mode: "interest_overlap_fallback",
    semanticAvailable: false,
    embeddingProvider: embeddingStatus.provider,
    embeddingModel: embeddingStatus.model,
    notice:
      embeddingStatus.reason ||
      "pgvector embeddings have not been generated yet. Showing relational club-interest overlap matches.",
    items: ranked.map(({ event, matched }) => ({
      eventId: event.eventId,
      slug: event.slug,
      title: event.title,
      description: event.description,
      clubId: event.club.clubId,
      clubName: event.club.name,
      clubSlug: event.club.slug,
      categoryName: event.category.name,
      eventDate: event.eventDate,
      startTime: event.startTime,
      endTime: event.endTime,
      venue: event.venue,
      maxCapacity: event.maxCapacity,
      currentRegistrations: event.currentRegistrations,
      status: event.status,
      isSampleEvent: event.isSampleEvent,
      similarityScore: null,
      matchedInterests: matched,
      mode: "interest_overlap_fallback",
    })),
  };
}

/**
 * Semantic search across clubs and events using pgvector cosine distance (<=>).
 */
export async function semanticSearchCatalog(query: string, limit = 10) {
  const embeddingStatus = getEmbeddingStatus();

  const storedVecCheck = await prisma.$queryRaw<
    Array<{ clubs_with_vec: bigint; events_with_vec: bigint }>
  >`
    SELECT
      (SELECT COUNT(*) FROM clubs WHERE status = 'ACTIVE' AND embedding IS NOT NULL) AS clubs_with_vec,
      (SELECT COUNT(*) FROM events WHERE status IN ('UPCOMING', 'ONGOING') AND embedding IS NOT NULL) AS events_with_vec
  `;

  const hasStoredVectors =
    Number(storedVecCheck[0]?.clubs_with_vec ?? 0) > 0 ||
    Number(storedVecCheck[0]?.events_with_vec ?? 0) > 0;

  if (!hasStoredVectors) {
    return {
      semanticAvailable: false,
      mode: "unavailable" as const,
      provider: embeddingStatus.provider,
      model: embeddingStatus.model,
      error:
        embeddingStatus.reason ||
        "No pgvector embeddings are stored in PostgreSQL yet. Sync embeddings from the Admin Console or run npm run db:embeddings.",
      clubs: [] as RecommendedClubItem[],
      events: [] as RecommendedEventItem[],
    };
  }

  const embedResult = await generateEmbedding(query);

  if (!embedResult.available || !embedResult.embedding) {
    return {
      semanticAvailable: false,
      mode: "unavailable" as const,
      provider: embeddingStatus.provider,
      model: embeddingStatus.model,
      error: embedResult.error || embeddingStatus.reason,
      clubs: [] as RecommendedClubItem[],
      events: [] as RecommendedEventItem[],
    };
  }

  const vectorLiteral = formatVectorLiteral(embedResult.embedding);

  const clubRows = await prisma.$queryRaw<
    Array<{
      club_id: string;
      slug: string;
      name: string;
      category: string;
      campus: string;
      tagline: string | null;
      description: string;
      activities: string;
      is_sample_description: boolean;
      member_count: number;
      is_featured: boolean;
      similarity_score: number;
    }>
  >`
    SELECT
      club_id,
      slug,
      name,
      category::text AS category,
      campus,
      tagline,
      description,
      activities,
      is_sample_description,
      member_count,
      is_featured,
      (1 - (embedding <=> ${vectorLiteral}::vector(768)))::float AS similarity_score
    FROM clubs
    WHERE status = 'ACTIVE'
      AND embedding IS NOT NULL
    ORDER BY embedding <=> ${vectorLiteral}::vector(768) ASC
    LIMIT ${limit}
  `;

  const eventRows = await prisma.$queryRaw<
    Array<{
      event_id: string;
      slug: string;
      title: string;
      description: string;
      club_id: string;
      club_name: string;
      club_slug: string;
      category_name: string;
      event_date: Date;
      start_time: string;
      end_time: string;
      venue: string;
      max_capacity: number;
      current_registrations: number;
      status: string;
      is_sample_event: boolean;
      similarity_score: number;
    }>
  >`
    SELECT
      e.event_id,
      e.slug,
      e.title,
      e.description,
      c.club_id,
      c.name AS club_name,
      c.slug AS club_slug,
      ec.name AS category_name,
      e.event_date,
      e.start_time,
      e.end_time,
      e.venue,
      e.max_capacity,
      e.current_registrations,
      e.status::text AS status,
      e.is_sample_event,
      (1 - (e.embedding <=> ${vectorLiteral}::vector(768)))::float AS similarity_score
    FROM events e
    INNER JOIN clubs c ON c.club_id = e.club_id
    INNER JOIN event_categories ec ON ec.category_id = e.category_id
    WHERE e.embedding IS NOT NULL
      AND e.status IN ('UPCOMING', 'ONGOING')
    ORDER BY e.embedding <=> ${vectorLiteral}::vector(768) ASC
    LIMIT ${limit}
  `;

  return {
    semanticAvailable: true,
    mode: "pgvector_cosine" as const,
    provider: embedResult.provider,
    model: embedResult.model,
    clubs: clubRows.map((row) => ({
      clubId: row.club_id,
      slug: row.slug,
      name: row.name,
      category: row.category,
      campus: row.campus,
      tagline: row.tagline,
      description: row.description,
      activities: row.activities,
      isSampleDescription: row.is_sample_description,
      memberCount: row.member_count,
      isFeatured: row.is_featured,
      similarityScore: Math.max(0, Math.min(1, Number(row.similarity_score))),
      matchedInterests: [],
      mode: "pgvector_cosine" as const,
    })),
    events: eventRows.map((row) => ({
      eventId: row.event_id,
      slug: row.slug,
      title: row.title,
      description: row.description,
      clubId: row.club_id,
      clubName: row.club_name,
      clubSlug: row.club_slug,
      categoryName: row.category_name,
      eventDate: row.event_date,
      startTime: row.start_time,
      endTime: row.end_time,
      venue: row.venue,
      maxCapacity: row.max_capacity,
      currentRegistrations: row.current_registrations,
      status: row.status,
      isSampleEvent: row.is_sample_event,
      similarityScore: Math.max(0, Math.min(1, Number(row.similarity_score))),
      matchedInterests: [],
      mode: "pgvector_cosine" as const,
    })),
  };
}

/**
 * Find similar clubs using pgvector cosine distance or shared interests fallback.
 */
export async function getSimilarClubs(clubId: string, limit = 4) {
  const vectorCheck = await prisma.$queryRaw<Array<{ has_vec: boolean }>>`
    SELECT EXISTS(
      SELECT 1 FROM clubs WHERE club_id = ${clubId} AND embedding IS NOT NULL
    ) AS has_vec
  `;

  if (vectorCheck[0]?.has_vec) {
    const rows = await prisma.$queryRaw<
      Array<{
        club_id: string;
        slug: string;
        name: string;
        category: string;
        tagline: string | null;
        is_sample_description: boolean;
        member_count: number;
        similarity_score: number;
      }>
    >`
      SELECT
        c2.club_id,
        c2.slug,
        c2.name,
        c2.category::text AS category,
        c2.tagline,
        c2.is_sample_description,
        c2.member_count,
        (1 - (c2.embedding <=> c1.embedding))::float AS similarity_score
      FROM clubs c1
      INNER JOIN clubs c2 ON c1.club_id <> c2.club_id
      WHERE c1.club_id = ${clubId}
        AND c2.embedding IS NOT NULL
        AND c2.status = 'ACTIVE'
      ORDER BY c2.embedding <=> c1.embedding ASC
      LIMIT ${limit}
    `;

    if (rows.length > 0) {
      return {
        mode: "pgvector_cosine" as const,
        items: rows.map((r) => ({
          clubId: r.club_id,
          slug: r.slug,
          name: r.name,
          category: r.category,
          tagline: r.tagline,
          isSampleDescription: r.is_sample_description,
          memberCount: r.member_count,
          similarityScore: Math.max(0, Math.min(1, Number(r.similarity_score))),
        })),
      };
    }
  }

  // Fallback: shared category + shared interests
  const targetClub = await prisma.club.findUnique({
    where: { clubId },
    include: { interests: true },
  });

  if (!targetClub) {
    return { mode: "interest_overlap_fallback" as const, items: [] };
  }

  const targetInterestIds = targetClub.interests.map((i) => i.interestId);
  const orConditions: Prisma.ClubWhereInput[] = [{ category: targetClub.category }];
  if (targetInterestIds.length > 0) {
    orConditions.push({ interests: { some: { interestId: { in: targetInterestIds } } } });
  }

  const candidates = await prisma.club.findMany({
    where: {
      clubId: { not: clubId },
      status: "ACTIVE",
      OR: orConditions,
    },
    take: limit,
    orderBy: [{ memberCount: "desc" }],
  });

  return {
    mode: "interest_overlap_fallback" as const,
    items: candidates.map((c) => ({
      clubId: c.clubId,
      slug: c.slug,
      name: c.name,
      category: c.category,
      tagline: c.tagline,
      isSampleDescription: c.isSampleDescription,
      memberCount: c.memberCount,
      similarityScore: null,
    })),
  };
}
