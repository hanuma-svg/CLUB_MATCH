import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";

class RegistrationError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { user, errorResponse } = await requireRole(["STUDENT"]);
  if (errorResponse || !user || !user.studentId) {
    return (
      errorResponse ??
      NextResponse.json({ error: "Only registered students can register for events" }, { status: 403 })
    );
  }

  try {
    const { id } = await context.params;

    const result = await prisma.$transaction(async (tx) => {
      // Lock the event row (FOR UPDATE) to prevent race-condition overbooking
      const lockedEvents = await tx.$queryRaw<
        Array<{
          event_id: string;
          title: string;
          status: string;
          max_capacity: number;
          current_registrations: number;
          registration_deadline: Date;
        }>
      >`
        SELECT event_id, title, status::text AS status, max_capacity, current_registrations, registration_deadline
        FROM events
        WHERE event_id = ${id} OR slug = ${id}
        FOR UPDATE
      `;

      const ev = lockedEvents[0];
      if (!ev) {
        throw new RegistrationError("Event not found", 404);
      }

      if (ev.status !== "UPCOMING" && ev.status !== "ONGOING") {
        throw new RegistrationError(`Registration is closed because event is ${ev.status}`, 400);
      }

      if (new Date() > new Date(ev.registration_deadline)) {
        throw new RegistrationError("Registration deadline has passed", 400);
      }

      const existing = await tx.eventRegistration.findUnique({
        where: {
          studentId_eventId: {
            studentId: user.studentId!,
            eventId: ev.event_id,
          },
        },
      });

      if (existing && (existing.status === "REGISTERED" || existing.status === "ATTENDED")) {
        throw new RegistrationError("You are already registered for this event", 409);
      }

      const activeCount = await tx.eventRegistration.count({
        where: {
          eventId: ev.event_id,
          status: { in: ["REGISTERED", "ATTENDED"] },
        },
      });

      if (activeCount >= ev.max_capacity) {
        throw new RegistrationError("Event has reached maximum capacity", 409);
      }

      const registration = existing
        ? await tx.eventRegistration.update({
            where: { registrationId: existing.registrationId },
            data: {
              status: "REGISTERED",
              cancelledAt: null,
              registeredAt: new Date(),
            },
          })
        : await tx.eventRegistration.create({
            data: {
              studentId: user.studentId!,
              eventId: ev.event_id,
              status: "REGISTERED",
            },
          });

      const updatedCount = activeCount + 1;
      await tx.event.update({
        where: { eventId: ev.event_id },
        data: { currentRegistrations: updatedCount },
      });

      await tx.resourceActivity.create({
        data: {
          actorUserId: user.userId,
          actorRole: user.role,
          action: "EVENT_REGISTERED",
          entityType: "EVENT",
          entityId: ev.event_id,
          summary: `Student registered for "${ev.title}" (${updatedCount}/${ev.max_capacity})`,
        },
      });

      return {
        registration,
        currentRegistrations: updatedCount,
        maxCapacity: ev.max_capacity,
      };
    });

    return NextResponse.json(
      {
        message: "Registration confirmed!",
        registration: result.registration,
        currentRegistrations: result.currentRegistrations,
        maxCapacity: result.maxCapacity,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof RegistrationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("POST /api/events/[id]/register error:", error);
    return NextResponse.json({ error: "Failed to complete event registration" }, { status: 500 });
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

    const result = await prisma.$transaction(async (tx) => {
      const lockedEvents = await tx.$queryRaw<
        Array<{
          event_id: string;
          title: string;
          status: string;
          event_date: Date;
        }>
      >`
        SELECT event_id, title, status::text AS status, event_date
        FROM events
        WHERE event_id = ${id} OR slug = ${id}
        FOR UPDATE
      `;

      const ev = lockedEvents[0];
      if (!ev) {
        throw new RegistrationError("Event not found", 404);
      }

      if (ev.status === "COMPLETED") {
        throw new RegistrationError("Cannot cancel registration for a completed event", 400);
      }

      const existing = await tx.eventRegistration.findUnique({
        where: {
          studentId_eventId: {
            studentId: user.studentId!,
            eventId: ev.event_id,
          },
        },
      });

      if (!existing || existing.status !== "REGISTERED") {
        throw new RegistrationError("No active registration found to cancel", 404);
      }

      const updatedReg = await tx.eventRegistration.update({
        where: { registrationId: existing.registrationId },
        data: {
          status: "CANCELLED",
          cancelledAt: new Date(),
        },
      });

      const activeCount = await tx.eventRegistration.count({
        where: {
          eventId: ev.event_id,
          status: { in: ["REGISTERED", "ATTENDED"] },
        },
      });

      await tx.event.update({
        where: { eventId: ev.event_id },
        data: { currentRegistrations: activeCount },
      });

      await tx.resourceActivity.create({
        data: {
          actorUserId: user.userId,
          actorRole: user.role,
          action: "REGISTRATION_CANCELLED",
          entityType: "EVENT",
          entityId: ev.event_id,
          summary: `Student cancelled registration for "${ev.title}"`,
        },
      });

      return { registration: updatedReg, currentRegistrations: activeCount };
    });

    return NextResponse.json({
      message: "Registration cancelled",
      registration: result.registration,
      currentRegistrations: result.currentRegistrations,
    });
  } catch (error) {
    if (error instanceof RegistrationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("DELETE /api/events/[id]/register error:", error);
    return NextResponse.json({ error: "Failed to cancel registration" }, { status: 500 });
  }
}
