import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole, verifyCoordinatorClubAccess } from "@/lib/rbac";

const updateRegStatusSchema = z.object({
  registrationId: z.string().min(1),
  status: z.enum(["REGISTERED", "ATTENDED", "CANCELLED"]),
});

export async function PATCH(req: NextRequest) {
  const { user, errorResponse } = await requireRole(["CLUB_COORDINATOR", "ADMIN"]);
  if (errorResponse || !user) return errorResponse!;

  try {
    const body = await req.json();
    const parsed = updateRegStatusSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
    }

    const reg = await prisma.eventRegistration.findUnique({
      where: { registrationId: parsed.data.registrationId },
      include: { event: true },
    });

    if (!reg) {
      return NextResponse.json({ error: "Registration not found" }, { status: 404 });
    }

    if (user.role === "CLUB_COORDINATOR") {
      if (!user.coordinatorId) {
        return NextResponse.json({ error: "Coordinator profile missing" }, { status: 403 });
      }
      const allowed = await verifyCoordinatorClubAccess(user.coordinatorId, reg.event.clubId);
      if (!allowed) {
        return NextResponse.json(
          { error: "Forbidden: registration belongs to an unassigned club" },
          { status: 403 }
        );
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const next = await tx.eventRegistration.update({
        where: { registrationId: reg.registrationId },
        data: {
          status: parsed.data.status,
          cancelledAt: parsed.data.status === "CANCELLED" ? new Date() : null,
        },
      });

      const activeCount = await tx.eventRegistration.count({
        where: {
          eventId: reg.eventId,
          status: { in: ["REGISTERED", "ATTENDED"] },
        },
      });

      await tx.event.update({
        where: { eventId: reg.eventId },
        data: { currentRegistrations: activeCount },
      });

      return next;
    });

    return NextResponse.json({ registration: updated });
  } catch (error) {
    console.error("PATCH /api/coordinator/registrations error:", error);
    return NextResponse.json({ error: "Failed to update registration status" }, { status: 500 });
  }
}
