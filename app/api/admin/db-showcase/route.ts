import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";

/**
 * Live DBMS Level 3 Showcase Endpoint
 * Executes actual SQL views, GROUP BY + HAVING aggregate queries, subqueries,
 * and inspects PostgreSQL pg_indexes & pg_trigger metadata.
 */
export async function GET() {
  const { user, errorResponse } = await requireRole(["ADMIN"]);
  if (errorResponse || !user) return errorResponse!;

  try {
    const [popularView, eventStatsView, clubSummaryView, studentSummaryView, aboveAvgEvents, dbMetadata] =
      await Promise.all([
        prisma.$queryRaw`SELECT * FROM v_popular_clubs LIMIT 8`.catch(() => []),
        prisma.$queryRaw`SELECT * FROM v_event_registration_stats ORDER BY event_date ASC LIMIT 8`.catch(
          () => []
        ),
        prisma.$queryRaw`
          SELECT * FROM v_club_event_summary
          WHERE total_events > 0
          ORDER BY total_registrations_received DESC
          LIMIT 8
        `.catch(() => []),
        prisma.$queryRaw`
          SELECT * FROM v_student_registration_summary
          ORDER BY active_registrations_count DESC, interest_count DESC
          LIMIT 8
        `.catch(() => []),
        prisma.$queryRaw`
          SELECT
            e.event_id,
            e.title,
            e.current_registrations,
            e.max_capacity,
            ROUND((e.current_registrations::NUMERIC / NULLIF(e.max_capacity, 0)) * 100, 1)::float AS fill_pct
          FROM events e
          WHERE e.status = 'UPCOMING'
            AND (e.current_registrations::NUMERIC / NULLIF(e.max_capacity, 0)) >= (
              SELECT COALESCE(AVG(e2.current_registrations::NUMERIC / NULLIF(e2.max_capacity, 0)), 0)
              FROM events e2
              WHERE e2.status = 'UPCOMING'
            )
          ORDER BY fill_pct DESC
        `,
        prisma.$queryRaw<
          Array<{
            pg_version: string;
            has_pgvector: boolean;
            view_count: bigint;
            trigger_count: bigint;
            index_count: bigint;
          }>
        >`
          SELECT
            version() AS pg_version,
            EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'vector') AS has_pgvector,
            (SELECT COUNT(*) FROM information_schema.views WHERE table_schema = 'public') AS view_count,
            (SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_schema = 'public') AS trigger_count,
            (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public') AS index_count
        `,
      ]);

    const meta = dbMetadata[0];
    return NextResponse.json({
      metadata: meta
        ? {
            pgVersion: meta.pg_version,
            hasPgvector: meta.has_pgvector,
            viewCount: Number(meta.view_count),
            triggerCount: Number(meta.trigger_count),
            indexCount: Number(meta.index_count),
          }
        : null,
      popularClubsView: popularView,
      eventStatsView,
      clubEventSummaryView: clubSummaryView,
      studentSummaryView,
      aboveAverageEventsSubquery: aboveAvgEvents,
    });
  } catch (error) {
    console.error("GET /api/admin/db-showcase error:", error);
    return NextResponse.json({ error: "Failed to execute DBMS showcase queries" }, { status: 500 });
  }
}
