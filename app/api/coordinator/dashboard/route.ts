import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";

export async function GET() {
  const { user, errorResponse } = await requireRole(["CLUB_COORDINATOR"]);
  if (errorResponse || !user || !user.coordinatorId) {
    return errorResponse ?? NextResponse.json({ error: "Coordinator profile not found" }, { status: 403 });
  }

  try {
    const assignments = await prisma.clubCoordinatorAssignment.findMany({
      where: { coordinatorId: user.coordinatorId },
      include: {
        club: {
          include: {
            interests: { include: { interest: true } },
            events: {
              orderBy: { eventDate: "asc" },
              include: {
                category: true,
                registrations: {
                  include: {
                    student: {
                      include: {
                        user: { select: { fullName: true, email: true } },
                      },
                    },
                  },
                  orderBy: { registeredAt: "desc" },
                },
              },
            },
            _count: {
              select: { memberships: true, bookmarks: true, events: true },
            },
          },
        },
      },
    });

    const assignedClubs = assignments.map((a) => ({
      assignmentTitle: a.title,
      assignedAt: a.assignedAt,
      ...a.club,
    }));

    const clubIds = assignedClubs.map((c) => c.clubId);
    const [categories, activities] = await Promise.all([
      prisma.eventCategory.findMany({ orderBy: { name: "asc" } }),
      clubIds.length > 0
        ? prisma.resourceActivity.findMany({
            where: {
              OR: [
                { entityType: "CLUB", entityId: { in: clubIds } },
                { actorUserId: user.userId },
              ],
            },
            orderBy: { createdAt: "desc" },
            take: 15,
          })
        : Promise.resolve([]),
    ]);

    return NextResponse.json({
      assignedClubs,
      categories,
      activities,
    });
  } catch (error) {
    console.error("GET /api/coordinator/dashboard error:", error);
    return NextResponse.json({ error: "Failed to load coordinator dashboard" }, { status: 500 });
  }
}
