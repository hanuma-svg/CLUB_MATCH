import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";

export async function GET() {
  const { user, errorResponse } = await requireRole(["STUDENT"]);
  if (errorResponse || !user || !user.studentId) {
    return errorResponse ?? NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  const registrations = await prisma.eventRegistration.findMany({
    where: { studentId: user.studentId },
    include: {
      event: {
        include: {
          club: { select: { clubId: true, name: true, slug: true, category: true } },
          category: { select: { name: true } },
        },
      },
    },
    orderBy: { registeredAt: "desc" },
  });

  return NextResponse.json({ registrations });
}
