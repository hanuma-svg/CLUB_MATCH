import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { updateInterestsSchema } from "@/lib/validations";
import { syncStudentEmbedding } from "@/lib/recommendations";
import { logResourceActivity } from "@/lib/activity";

export async function GET() {
  const { user, errorResponse } = await requireRole(["STUDENT"]);
  if (errorResponse || !user || !user.studentId) {
    return errorResponse ?? NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  const rows = await prisma.studentInterest.findMany({
    where: { studentId: user.studentId },
    include: { interest: true },
  });

  return NextResponse.json({
    interestIds: rows.map((r) => r.interestId),
    interests: rows.map((r) => r.interest),
  });
}

export async function PUT(req: NextRequest) {
  const { user, errorResponse } = await requireRole(["STUDENT"]);
  if (errorResponse || !user || !user.studentId) {
    return errorResponse ?? NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  try {
    const body = await req.json();
    const parsed = updateInterestsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const uniqueIds = [...new Set(parsed.data.interestIds)];
    const validInterests = await prisma.interest.findMany({
      where: { interestId: { in: uniqueIds } },
      select: { interestId: true },
    });

    if (validInterests.length !== uniqueIds.length) {
      return NextResponse.json({ error: "One or more selected interests do not exist" }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.studentInterest.deleteMany({
        where: { studentId: user.studentId! },
      });

      await tx.studentInterest.createMany({
        data: uniqueIds.map((interestId) => ({
          studentId: user.studentId!,
          interestId,
        })),
      });

      await tx.student.update({
        where: { studentId: user.studentId! },
        data: { onboardingCompleted: true },
      });
    });

    const embeddingSync = await syncStudentEmbedding(user.studentId);

    await logResourceActivity({
      actorUserId: user.userId,
      actorRole: user.role,
      action: "STUDENT_INTERESTS_UPDATED",
      entityType: "STUDENT",
      entityId: user.studentId,
      summary: `Student updated ${uniqueIds.length} interests (embedding synced: ${embeddingSync.synced})`,
    });

    const updated = await prisma.studentInterest.findMany({
      where: { studentId: user.studentId },
      include: { interest: true },
    });

    return NextResponse.json({
      message: "Interests saved successfully",
      interests: updated.map((u) => u.interest),
      embeddingSync,
    });
  } catch (error) {
    console.error("Save interests error:", error);
    return NextResponse.json({ error: "Failed to save interests" }, { status: 500 });
  }
}
