import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";

export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { user, errorResponse } = await requireRole(["STUDENT"]);
  if (errorResponse || !user || !user.studentId) {
    return errorResponse ?? NextResponse.json({ error: "Student profile not found" }, { status: 403 });
  }

  try {
    const { id } = await context.params;
    const club = await prisma.club.findFirst({
      where: { OR: [{ clubId: id }, { slug: id }], status: "ACTIVE" },
    });
    if (!club) {
      return NextResponse.json({ error: "Active club not found" }, { status: 404 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.clubMembership.findUnique({
        where: { studentId_clubId: { studentId: user.studentId!, clubId: club.clubId } },
      });

      if (existing && existing.status === "ACTIVE") {
        return { alreadyMember: true, club };
      }

      await tx.clubMembership.upsert({
        where: { studentId_clubId: { studentId: user.studentId!, clubId: club.clubId } },
        update: { status: "ACTIVE", joinedAt: new Date() },
        create: {
          studentId: user.studentId!,
          clubId: club.clubId,
          role: "Member",
          status: "ACTIVE",
        },
      });

      const updatedClub = await tx.club.update({
        where: { clubId: club.clubId },
        data: { memberCount: { increment: 1 } },
      });

      await tx.resourceActivity.create({
        data: {
          actorUserId: user.userId,
          actorRole: user.role,
          action: "CLUB_JOINED",
          entityType: "CLUB",
          entityId: club.clubId,
          summary: `Student joined "${club.name}"`,
        },
      });

      return { alreadyMember: false, club: updatedClub };
    });

    return NextResponse.json(
      {
        isMember: true,
        memberCount: result.club.memberCount,
        message: result.alreadyMember ? "Already a member" : `Joined ${club.name}!`,
      },
      { status: result.alreadyMember ? 200 : 201 }
    );
  } catch (error) {
    console.error("POST /api/clubs/[id]/membership error:", error);
    return NextResponse.json({ error: "Failed to join club" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { user, errorResponse } = await requireRole(["STUDENT"]);
  if (errorResponse || !user || !user.studentId) {
    return errorResponse ?? NextResponse.json({ error: "Student profile not found" }, { status: 403 });
  }

  try {
    const { id } = await context.params;
    const club = await prisma.club.findFirst({
      where: { OR: [{ clubId: id }, { slug: id }] },
    });
    if (!club) {
      return NextResponse.json({ error: "Club not found" }, { status: 404 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.clubMembership.findUnique({
        where: { studentId_clubId: { studentId: user.studentId!, clubId: club.clubId } },
      });

      if (!existing || existing.status !== "ACTIVE") {
        return { club };
      }

      await tx.clubMembership.delete({
        where: { studentId_clubId: { studentId: user.studentId!, clubId: club.clubId } },
      });

      const updatedClub = await tx.club.update({
        where: { clubId: club.clubId },
        data: { memberCount: Math.max(0, club.memberCount - 1) },
      });

      return { club: updatedClub };
    });

    return NextResponse.json({
      isMember: false,
      memberCount: result.club.memberCount,
      message: `Left ${club.name}`,
    });
  } catch (error) {
    console.error("DELETE /api/clubs/[id]/membership error:", error);
    return NextResponse.json({ error: "Failed to leave club" }, { status: 500 });
  }
}
