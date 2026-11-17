import { NextResponse } from "next/server";
import type { UserRole } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function getCurrentSessionUser() {
  const session = await auth();
  if (!session?.user?.userId) {
    return null;
  }
  return session.user;
}

export async function requireRole(allowedRoles: UserRole[]) {
  const user = await getCurrentSessionUser();
  if (!user) {
    return {
      user: null,
      errorResponse: NextResponse.json({ error: "Authentication required" }, { status: 401 }),
    };
  }

  if (!allowedRoles.includes(user.role)) {
    return {
      user: null,
      errorResponse: NextResponse.json(
        { error: "Forbidden: insufficient role permissions" },
        { status: 403 }
      ),
    };
  }

  return { user, errorResponse: null };
}

export async function verifyCoordinatorClubAccess(coordinatorId: string, clubId: string) {
  const assignment = await prisma.clubCoordinatorAssignment.findUnique({
    where: {
      coordinatorId_clubId: {
        coordinatorId,
        clubId,
      },
    },
  });
  return Boolean(assignment);
}
