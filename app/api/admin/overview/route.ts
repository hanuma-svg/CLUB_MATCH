import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { getEmbeddingStatus } from "@/lib/embeddings";

export async function GET() {
  const { user, errorResponse } = await requireRole(["ADMIN"]);
  if (errorResponse || !user) return errorResponse!;

  try {
    const [
      totalStudents,
      totalClubs,
      activeClubs,
      pendingClubsCount,
      totalEvents,
      totalRegistrations,
      popularClubs,
      popularEvents,
      pendingClubs,
      recentActivities,
      vectorCounts,
    ] = await Promise.all([
      prisma.student.count(),
      prisma.club.count(),
      prisma.club.count({ where: { status: "ACTIVE" } }),
      prisma.club.count({ where: { status: "PENDING" } }),
      prisma.event.count(),
      prisma.eventRegistration.count({ where: { status: { in: ["REGISTERED", "ATTENDED"] } } }),
      prisma.club.findMany({
        where: { status: "ACTIVE" },
        orderBy: [{ memberCount: "desc" }, { bookmarks: { _count: "desc" } }],
        take: 6,
        include: {
          _count: { select: { bookmarks: true, events: true, memberships: true } },
        },
      }),
      prisma.event.findMany({
        orderBy: [{ currentRegistrations: "desc" }, { eventDate: "asc" }],
        take: 6,
        include: {
          club: { select: { name: true, slug: true } },
          category: { select: { name: true } },
        },
      }),
      prisma.club.findMany({
        where: { status: "PENDING" },
        orderBy: { createdAt: "desc" },
        include: {
          coordinatorAssignments: {
            include: {
              coordinator: { include: { user: { select: { fullName: true, email: true } } } },
            },
          },
        },
      }),
      prisma.resourceActivity.findMany({
        orderBy: { createdAt: "desc" },
        take: 25,
        include: {
          actor: { select: { fullName: true, email: true, role: true } },
        },
      }),
      prisma.$queryRaw<
        Array<{ clubs_with_vec: bigint; events_with_vec: bigint; students_with_vec: bigint }>
      >`
        SELECT
          (SELECT COUNT(*) FROM clubs WHERE embedding IS NOT NULL) AS clubs_with_vec,
          (SELECT COUNT(*) FROM events WHERE embedding IS NOT NULL) AS events_with_vec,
          (SELECT COUNT(*) FROM students WHERE interest_embedding IS NOT NULL) AS students_with_vec
      `,
    ]);

    return NextResponse.json({
      stats: {
        totalStudents,
        totalClubs,
        activeClubs,
        pendingClubsCount,
        totalEvents,
        totalRegistrations,
        clubsWithEmbeddings: Number(vectorCounts[0]?.clubs_with_vec ?? 0),
        eventsWithEmbeddings: Number(vectorCounts[0]?.events_with_vec ?? 0),
        studentsWithEmbeddings: Number(vectorCounts[0]?.students_with_vec ?? 0),
      },
      embeddingStatus: getEmbeddingStatus(),
      popularClubs,
      popularEvents,
      pendingClubs,
      recentActivities,
    });
  } catch (error) {
    console.error("GET /api/admin/overview error:", error);
    return NextResponse.json({ error: "Failed to load admin overview" }, { status: 500 });
  }
}
