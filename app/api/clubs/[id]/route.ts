import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSessionUser, requireRole, verifyCoordinatorClubAccess } from "@/lib/rbac";
import { updateClubSchema } from "@/lib/validations";
import { getSimilarClubs, syncClubEmbedding } from "@/lib/recommendations";
import { logResourceActivity } from "@/lib/activity";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const club = await prisma.club.findFirst({
      where: { OR: [{ clubId: id }, { slug: id }] },
      include: {
        interests: { include: { interest: true } },
        events: {
          orderBy: { eventDate: "asc" },
          include: { category: true },
        },
        coordinatorAssignments: {
          include: {
            coordinator: {
              include: { user: { select: { fullName: true, email: true } } },
            },
          },
        },
        _count: {
          select: { bookmarks: true, memberships: true, events: true },
        },
      },
    });

    if (!club) {
      return NextResponse.json({ error: "Club not found" }, { status: 404 });
    }

    const user = await getCurrentSessionUser();
    if (club.status !== "ACTIVE") {
      const isAdmin = user?.role === "ADMIN";
      const isAssignedCoord =
        user?.role === "CLUB_COORDINATOR" &&
        user.coordinatorId &&
        (await verifyCoordinatorClubAccess(user.coordinatorId, club.clubId));
      if (!isAdmin && !isAssignedCoord) {
        return NextResponse.json({ error: "Club not found" }, { status: 404 });
      }
    }

    let isBookmarked = false;
    let isMember = false;
    if (user?.studentId) {
      const [bm, mem] = await Promise.all([
        prisma.bookmarkedClub.findUnique({
          where: { studentId_clubId: { studentId: user.studentId, clubId: club.clubId } },
        }),
        prisma.clubMembership.findUnique({
          where: { studentId_clubId: { studentId: user.studentId, clubId: club.clubId } },
        }),
      ]);
      isBookmarked = Boolean(bm);
      isMember = Boolean(mem && mem.status === "ACTIVE");
    }

    const similar = await getSimilarClubs(club.clubId, 4);

    return NextResponse.json({ club, isBookmarked, isMember, similarClubs: similar });
  } catch (error) {
    console.error("GET /api/clubs/[id] error:", error);
    return NextResponse.json({ error: "Failed to load club" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { user, errorResponse } = await requireRole(["ADMIN", "CLUB_COORDINATOR"]);
  if (errorResponse || !user) return errorResponse!;

  try {
    const { id } = await context.params;
    const existing = await prisma.club.findFirst({
      where: { OR: [{ clubId: id }, { slug: id }] },
    });
    if (!existing) {
      return NextResponse.json({ error: "Club not found" }, { status: 404 });
    }

    if (user.role === "CLUB_COORDINATOR") {
      if (!user.coordinatorId) {
        return NextResponse.json({ error: "Coordinator profile missing" }, { status: 403 });
      }
      const allowed = await verifyCoordinatorClubAccess(user.coordinatorId, existing.clubId);
      if (!allowed) {
        return NextResponse.json(
          { error: "Forbidden: you can only manage clubs assigned to you" },
          { status: 403 }
        );
      }
    }

    const body = await req.json();
    const parsed = updateClubSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = parsed.data;
    // Coordinators cannot approve/feature clubs themselves
    const statusUpdate = user.role === "ADMIN" && data.status ? { status: data.status } : {};
    const featuredUpdate =
      user.role === "ADMIN" && data.isFeatured !== undefined ? { isFeatured: data.isFeatured } : {};

    const updated = await prisma.$transaction(async (tx) => {
      if (data.interestIds) {
        await tx.clubInterest.deleteMany({ where: { clubId: existing.clubId } });
        if (data.interestIds.length > 0) {
          await tx.clubInterest.createMany({
            data: [...new Set(data.interestIds)].map((interestId) => ({
              clubId: existing.clubId,
              interestId,
              weight: 2,
            })),
          });
        }
      }

      return tx.club.update({
        where: { clubId: existing.clubId },
        data: {
          ...(data.name ? { name: data.name } : {}),
          ...(data.category ? { category: data.category } : {}),
          ...(data.campus ? { campus: data.campus } : {}),
          ...(data.tagline !== undefined ? { tagline: data.tagline } : {}),
          ...(data.description ? { description: data.description } : {}),
          ...(data.activities ? { activities: data.activities } : {}),
          ...(data.isSampleDescription !== undefined
            ? { isSampleDescription: data.isSampleDescription }
            : {}),
          ...(data.verifiedCoordinatorName !== undefined
            ? { verifiedCoordinatorName: data.verifiedCoordinatorName }
            : {}),
          ...(data.verifiedEmail !== undefined ? { verifiedEmail: data.verifiedEmail || null } : {}),
          ...statusUpdate,
          ...featuredUpdate,
        },
        include: {
          interests: { include: { interest: true } },
        },
      });
    });

    await syncClubEmbedding(updated.clubId).catch(() => null);

    await logResourceActivity({
      actorUserId: user.userId,
      actorRole: user.role,
      action: "CLUB_UPDATED",
      entityType: "CLUB",
      entityId: updated.clubId,
      summary: `Updated club "${updated.name}" (${updated.status})`,
    });

    return NextResponse.json({ club: updated });
  } catch (error) {
    console.error("PATCH /api/clubs/[id] error:", error);
    return NextResponse.json({ error: "Failed to update club" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { user, errorResponse } = await requireRole(["ADMIN"]);
  if (errorResponse || !user) return errorResponse!;

  try {
    const { id } = await context.params;
    const existing = await prisma.club.findFirst({
      where: { OR: [{ clubId: id }, { slug: id }] },
    });
    if (!existing) {
      return NextResponse.json({ error: "Club not found" }, { status: 404 });
    }

    const updated = await prisma.club.update({
      where: { clubId: existing.clubId },
      data: { status: "INACTIVE" },
    });

    await logResourceActivity({
      actorUserId: user.userId,
      actorRole: user.role,
      action: "CLUB_DEACTIVATED",
      entityType: "CLUB",
      entityId: updated.clubId,
      summary: `Admin deactivated club "${updated.name}"`,
    });

    return NextResponse.json({ message: "Club deactivated", club: updated });
  } catch (error) {
    console.error("DELETE /api/clubs/[id] error:", error);
    return NextResponse.json({ error: "Failed to deactivate club" }, { status: 500 });
  }
}
