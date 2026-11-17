import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { getRecommendedClubsForStudent, getRecommendedEventsForStudent } from "@/lib/recommendations";

export async function GET() {
  const { user, errorResponse } = await requireRole(["STUDENT"]);
  if (errorResponse || !user || !user.studentId) {
    return errorResponse ?? NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  const [student, bookmarks, memberships, registrations, clubRecs, eventRecs] = await Promise.all([
    prisma.student.findUnique({
      where: { studentId: user.studentId },
      include: {
        user: { select: { fullName: true, email: true } },
        interests: { include: { interest: true } },
      },
    }),
    prisma.bookmarkedClub.findMany({
      where: { studentId: user.studentId },
      include: { club: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.clubMembership.findMany({
      where: { studentId: user.studentId, status: "ACTIVE" },
      include: { club: true },
      orderBy: { joinedAt: "desc" },
    }),
    prisma.eventRegistration.findMany({
      where: { studentId: user.studentId },
      include: {
        event: {
          include: {
            club: { select: { clubId: true, name: true, slug: true } },
            category: { select: { name: true } },
          },
        },
      },
      orderBy: { registeredAt: "desc" },
    }),
    getRecommendedClubsForStudent(user.studentId, 6),
    getRecommendedEventsForStudent(user.studentId, 6),
  ]);

  return NextResponse.json({
    student,
    bookmarks: bookmarks.map((b) => b.club),
    memberships: memberships.map((m) => ({ joinedAt: m.joinedAt, role: m.role, club: m.club })),
    registrations,
    recommendedClubs: clubRecs,
    recommendedEvents: eventRecs,
  });
}
