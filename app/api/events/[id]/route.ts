import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSessionUser, requireRole, verifyCoordinatorClubAccess } from "@/lib/rbac";
import { updateEventSchema } from "@/lib/validations";
import { syncEventEmbedding } from "@/lib/recommendations";
import { logResourceActivity } from "@/lib/activity";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const event = await prisma.event.findFirst({
      where: { OR: [{ eventId: id }, { slug: id }] },
      include: {
        club: {
          include: {
            interests: { include: { interest: true } },
          },
        },
        category: true,
      },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const user = await getCurrentSessionUser();
    let registrationStatus: string | null = null;
    if (user?.studentId) {
      const reg = await prisma.eventRegistration.findUnique({
        where: { studentId_eventId: { studentId: user.studentId, eventId: event.eventId } },
      });
      registrationStatus = reg?.status ?? null;
    }

    return NextResponse.json({ event, registrationStatus });
  } catch (error) {
    console.error("GET /api/events/[id] error:", error);
    return NextResponse.json({ error: "Failed to load event" }, { status: 500 });
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
    const existing = await prisma.event.findFirst({
      where: { OR: [{ eventId: id }, { slug: id }] },
    });
    if (!existing) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    if (user.role === "CLUB_COORDINATOR") {
      if (!user.coordinatorId) {
        return NextResponse.json({ error: "Coordinator profile missing" }, { status: 403 });
      }
      const allowed = await verifyCoordinatorClubAccess(user.coordinatorId, existing.clubId);
      if (!allowed) {
        return NextResponse.json(
          { error: "Forbidden: you can only modify events for clubs assigned to you" },
          { status: 403 }
        );
      }
    }

    const body = await req.json();
    const parsed = updateEventSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = parsed.data;
    if (data.maxCapacity !== undefined && data.maxCapacity < existing.currentRegistrations) {
      return NextResponse.json(
        {
          error: `Capacity cannot be lower than current active registrations (${existing.currentRegistrations})`,
        },
        { status: 400 }
      );
    }

    const nextEventDate = data.eventDate ? new Date(data.eventDate) : existing.eventDate;
    const nextDeadline = data.registrationDeadline
      ? new Date(data.registrationDeadline)
      : existing.registrationDeadline;

    if (nextDeadline.getTime() > nextEventDate.getTime()) {
      return NextResponse.json(
        { error: "Registration deadline must be on or before the event date" },
        { status: 400 }
      );
    }

    const updated = await prisma.event.update({
      where: { eventId: existing.eventId },
      data: {
        ...(data.title ? { title: data.title } : {}),
        ...(data.description ? { description: data.description } : {}),
        ...(data.categoryId ? { categoryId: data.categoryId } : {}),
        ...(data.eventDate ? { eventDate: nextEventDate } : {}),
        ...(data.startTime ? { startTime: data.startTime } : {}),
        ...(data.endTime ? { endTime: data.endTime } : {}),
        ...(data.venue ? { venue: data.venue } : {}),
        ...(data.registrationDeadline ? { registrationDeadline: nextDeadline } : {}),
        ...(data.maxCapacity !== undefined ? { maxCapacity: data.maxCapacity } : {}),
        ...(data.status ? { status: data.status } : {}),
        ...(user.role === "ADMIN" && data.isFeatured !== undefined
          ? { isFeatured: data.isFeatured }
          : {}),
      },
      include: {
        club: { select: { clubId: true, name: true, slug: true } },
        category: true,
      },
    });

    await syncEventEmbedding(updated.eventId).catch(() => null);

    await logResourceActivity({
      actorUserId: user.userId,
      actorRole: user.role,
      action: "EVENT_UPDATED",
      entityType: "EVENT",
      entityId: updated.eventId,
      summary: `Updated event "${updated.title}"`,
    });

    return NextResponse.json({ event: updated });
  } catch (error) {
    console.error("PATCH /api/events/[id] error:", error);
    return NextResponse.json({ error: "Failed to update event" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { user, errorResponse } = await requireRole(["ADMIN", "CLUB_COORDINATOR"]);
  if (errorResponse || !user) return errorResponse!;

  try {
    const { id } = await context.params;
    const existing = await prisma.event.findFirst({
      where: { OR: [{ eventId: id }, { slug: id }] },
    });
    if (!existing) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    if (user.role === "CLUB_COORDINATOR") {
      if (!user.coordinatorId) {
        return NextResponse.json({ error: "Coordinator profile missing" }, { status: 403 });
      }
      const allowed = await verifyCoordinatorClubAccess(user.coordinatorId, existing.clubId);
      if (!allowed) {
        return NextResponse.json(
          { error: "Forbidden: you can only cancel events for your assigned clubs" },
          { status: 403 }
        );
      }
    }

    const cancelled = await prisma.event.update({
      where: { eventId: existing.eventId },
      data: { status: "CANCELLED" },
    });

    await logResourceActivity({
      actorUserId: user.userId,
      actorRole: user.role,
      action: "EVENT_CANCELLED",
      entityType: "EVENT",
      entityId: cancelled.eventId,
      summary: `Cancelled event "${cancelled.title}"`,
    });

    return NextResponse.json({ message: "Event cancelled", event: cancelled });
  } catch (error) {
    console.error("DELETE /api/events/[id] error:", error);
    return NextResponse.json({ error: "Failed to cancel event" }, { status: 500 });
  }
}
