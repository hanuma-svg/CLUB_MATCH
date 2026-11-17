import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { assignCoordinatorSchema } from "@/lib/validations";
import { logResourceActivity } from "@/lib/activity";

export async function GET() {
  const { user, errorResponse } = await requireRole(["ADMIN"]);
  if (errorResponse || !user) return errorResponse!;

  const [coordinators, clubs] = await Promise.all([
    prisma.clubCoordinator.findMany({
      include: {
        user: { select: { userId: true, fullName: true, email: true, isActive: true } },
        assignments: {
          include: {
            club: { select: { clubId: true, name: true, slug: true, category: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.club.findMany({
      select: { clubId: true, name: true, category: true, status: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return NextResponse.json({ coordinators, clubs });
}

export async function POST(req: NextRequest) {
  const { user, errorResponse } = await requireRole(["ADMIN"]);
  if (errorResponse || !user) return errorResponse!;

  try {
    const body = await req.json();
    const parsed = assignCoordinatorSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { coordinatorId, clubId, title } = parsed.data;
    const [coord, club] = await Promise.all([
      prisma.clubCoordinator.findUnique({ where: { coordinatorId } }),
      prisma.club.findUnique({ where: { clubId } }),
    ]);

    if (!coord || !club) {
      return NextResponse.json({ error: "Coordinator or club not found" }, { status: 404 });
    }

    const assignment = await prisma.clubCoordinatorAssignment.upsert({
      where: { coordinatorId_clubId: { coordinatorId, clubId } },
      update: { title, assignedByAdminId: user.adminId ?? null },
      create: {
        coordinatorId,
        clubId,
        title,
        assignedByAdminId: user.adminId ?? null,
      },
      include: {
        club: { select: { clubId: true, name: true } },
      },
    });

    await logResourceActivity({
      actorUserId: user.userId,
      actorRole: user.role,
      action: "COORDINATOR_ASSIGNED",
      entityType: "CLUB",
      entityId: clubId,
      summary: `Assigned coordinator ${coord.email} to "${club.name}"`,
    });

    return NextResponse.json({ assignment }, { status: 201 });
  } catch (error) {
    console.error("POST /api/admin/coordinators error:", error);
    return NextResponse.json({ error: "Failed to assign coordinator" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const { user, errorResponse } = await requireRole(["ADMIN"]);
  if (errorResponse || !user) return errorResponse!;

  const coordinatorId = req.nextUrl.searchParams.get("coordinatorId");
  const clubId = req.nextUrl.searchParams.get("clubId");
  if (!coordinatorId || !clubId) {
    return NextResponse.json(
      { error: "coordinatorId and clubId query parameters are required" },
      { status: 400 }
    );
  }

  await prisma.clubCoordinatorAssignment.deleteMany({
    where: { coordinatorId, clubId },
  });

  return NextResponse.json({ message: "Coordinator unassigned" });
}
