import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { updateProfileSchema } from "@/lib/validations";
import { syncStudentEmbedding } from "@/lib/recommendations";

export async function GET() {
  const { user, errorResponse } = await requireRole(["STUDENT"]);
  if (errorResponse || !user || !user.studentId) {
    return errorResponse ?? NextResponse.json({ error: "Student profile not found" }, { status: 404 });
  }

  const student = await prisma.student.findUnique({
    where: { studentId: user.studentId },
    include: {
      user: { select: { fullName: true, email: true, role: true } },
      interests: { include: { interest: true } },
      _count: { select: { bookmarks: true, registrations: true, memberships: true } },
    },
  });

  if (!student) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  return NextResponse.json({ student });
}

export async function PATCH(req: NextRequest) {
  const { user, errorResponse } = await requireRole(["STUDENT"]);
  if (errorResponse || !user || !user.studentId) {
    return errorResponse ?? NextResponse.json({ error: "Student profile not found" }, { status: 404 });
  }

  try {
    const body = await req.json();
    const parsed = updateProfileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { fullName, srn, department, semester, campus, bio } = parsed.data;

    const updated = await prisma.$transaction(async (tx) => {
      if (fullName) {
        await tx.userAccount.update({
          where: { userId: user.userId },
          data: { fullName },
        });
      }

      return tx.student.update({
        where: { studentId: user.studentId! },
        data: {
          ...(srn !== undefined ? { srn: srn || null } : {}),
          ...(department !== undefined ? { department: department || null } : {}),
          ...(semester !== undefined ? { semester } : {}),
          ...(campus !== undefined ? { campus } : {}),
          ...(bio !== undefined ? { bio: bio || null } : {}),
        },
        include: {
          user: { select: { fullName: true, email: true, role: true } },
        },
      });
    });

    if (bio !== undefined) {
      await syncStudentEmbedding(user.studentId).catch(() => null);
    }

    return NextResponse.json({ student: updated });
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "P2002"
    ) {
      return NextResponse.json(
        { error: "That SRN is already registered to another student." },
        { status: 409 }
      );
    }
    console.error("Update profile error:", error);
    return NextResponse.json({ error: "Failed to update student profile" }, { status: 500 });
  }
}
