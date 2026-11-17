import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { updateUserRoleSchema } from "@/lib/validations";
import { logResourceActivity } from "@/lib/activity";

export async function GET() {
  const { user, errorResponse } = await requireRole(["ADMIN"]);
  if (errorResponse || !user) return errorResponse!;

  const users = await prisma.userAccount.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      userId: true,
      email: true,
      fullName: true,
      role: true,
      isActive: true,
      createdAt: true,
      student: { select: { studentId: true, srn: true, department: true, semester: true } },
      clubCoordinator: {
        select: {
          coordinatorId: true,
          department: true,
          assignments: { include: { club: { select: { clubId: true, name: true } } } },
        },
      },
      admin: { select: { adminId: true, designation: true } },
    },
  });

  return NextResponse.json({ users });
}

export async function PATCH(req: NextRequest) {
  const { user, errorResponse } = await requireRole(["ADMIN"]);
  if (errorResponse || !user) return errorResponse!;

  try {
    const body = (await req.json()) as { userId?: string; role?: string; isActive?: boolean };
    if (!body.userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const parsed = updateUserRoleSchema.safeParse({
      role: body.role,
      isActive: body.isActive,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const target = await prisma.userAccount.findUnique({
      where: { userId: body.userId },
    });
    if (!target) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (target.userId === user.userId && (parsed.data.role !== "ADMIN" || parsed.data.isActive === false)) {
      return NextResponse.json(
        { error: "Administrators cannot disable or demote their own active account" },
        { status: 400 }
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      const acc = await tx.userAccount.update({
        where: { userId: target.userId },
        data: {
          role: parsed.data.role,
          ...(parsed.data.isActive !== undefined ? { isActive: parsed.data.isActive } : {}),
        },
      });

      if (parsed.data.role === "CLUB_COORDINATOR") {
        await tx.clubCoordinator.upsert({
          where: { userId: acc.userId },
          update: {},
          create: { userId: acc.userId, email: acc.email },
        });
      } else if (parsed.data.role === "ADMIN") {
        await tx.admin.upsert({
          where: { userId: acc.userId },
          update: {},
          create: { userId: acc.userId, email: acc.email },
        });
      } else if (parsed.data.role === "STUDENT") {
        await tx.student.upsert({
          where: { userId: acc.userId },
          update: {},
          create: { userId: acc.userId, email: acc.email },
        });
      }

      return acc;
    });

    await logResourceActivity({
      actorUserId: user.userId,
      actorRole: user.role,
      action: "USER_ROLE_UPDATED",
      entityType: "USER_ACCOUNT",
      entityId: updated.userId,
      summary: `Admin updated ${updated.email} role to ${updated.role} (active=${updated.isActive})`,
    });

    return NextResponse.json({
      user: {
        userId: updated.userId,
        email: updated.email,
        fullName: updated.fullName,
        role: updated.role,
        isActive: updated.isActive,
      },
    });
  } catch (error) {
    console.error("PATCH /api/admin/users error:", error);
    return NextResponse.json({ error: "Failed to update user role" }, { status: 500 });
  }
}
