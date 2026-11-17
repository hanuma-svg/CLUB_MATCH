import { NextRequest, NextResponse } from "next/server";
import type { EventStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole, verifyCoordinatorClubAccess } from "@/lib/rbac";
import { createEventSchema } from "@/lib/validations";
import { slugify } from "@/lib/slug";
import { syncEventEmbedding } from "@/lib/recommendations";
import { logResourceActivity } from "@/lib/activity";

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const q = sp.get("q")?.trim() || "";
    const category = sp.get("category") || "";
    const clubId = sp.get("clubId") || "";
    const status = sp.get("status") || "";
    const dateFrom = sp.get("dateFrom") || "";
    const dateTo = sp.get("dateTo") || "";
    const featured = sp.get("featured") === "true";

    const where: Prisma.EventWhereInput = {
      ...(status && status !== "ALL" ? { status: status as EventStatus } : {}),
      ...(clubId && clubId !== "ALL" ? { clubId } : {}),
      ...(featured ? { isFeatured: true } : {}),
      ...(category && category !== "ALL"
        ? {
            category: {
              OR: [{ categoryId: category }, { slug: category }, { name: { equals: category, mode: "insensitive" } }],
            },
          }
        : {}),
      ...(dateFrom || dateTo
        ? {
            eventDate: {
              ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
              ...(dateTo ? { lte: new Date(dateTo) } : {}),
            },
          }
        : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { description: { contains: q, mode: "insensitive" } },
              { venue: { contains: q, mode: "insensitive" } },
              { club: { name: { contains: q, mode: "insensitive" } } },
            ],
          }
        : {}),
    };

    const [events, categories] = await Promise.all([
      prisma.event.findMany({
        where,
        orderBy: [{ eventDate: "asc" }],
        include: {
          club: { select: { clubId: true, name: true, slug: true, category: true } },
          category: { select: { categoryId: true, name: true, slug: true } },
        },
      }),
      prisma.eventCategory.findMany({ orderBy: { name: "asc" } }),
    ]);

    return NextResponse.json({ events, categories, total: events.length });
  } catch (error) {
    console.error("GET /api/events error:", error);
    return NextResponse.json({ error: "Failed to load events" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { user, errorResponse } = await requireRole(["ADMIN", "CLUB_COORDINATOR"]);
  if (errorResponse || !user) return errorResponse!;

  try {
    const body = await req.json();
    const parsed = createEventSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = parsed.data;
    if (user.role === "CLUB_COORDINATOR") {
      if (!user.coordinatorId) {
        return NextResponse.json({ error: "Coordinator profile missing" }, { status: 403 });
      }
      const allowed = await verifyCoordinatorClubAccess(user.coordinatorId, data.clubId);
      if (!allowed) {
        return NextResponse.json(
          { error: "Forbidden: you can only create events for clubs assigned to you" },
          { status: 403 }
        );
      }
    }

    const [club, category] = await Promise.all([
      prisma.club.findUnique({ where: { clubId: data.clubId } }),
      prisma.eventCategory.findUnique({ where: { categoryId: data.categoryId } }),
    ]);

    if (!club) {
      return NextResponse.json({ error: "Organizing club not found" }, { status: 404 });
    }
    if (!category) {
      return NextResponse.json({ error: "Event category not found" }, { status: 404 });
    }

    const baseSlug = slugify(data.title);
    const slug = `${baseSlug}-${Date.now().toString(36)}`;

    const created = await prisma.event.create({
      data: {
        slug,
        title: data.title,
        description: data.description,
        clubId: data.clubId,
        categoryId: data.categoryId,
        eventDate: new Date(data.eventDate),
        startTime: data.startTime,
        endTime: data.endTime,
        venue: data.venue,
        registrationDeadline: new Date(data.registrationDeadline),
        maxCapacity: data.maxCapacity,
        bannerUrl: data.bannerUrl || null,
        isFeatured: user.role === "ADMIN" ? Boolean(data.isFeatured) : false,
        isSampleEvent: data.isSampleEvent ?? false,
        status: "UPCOMING",
      },
      include: {
        club: { select: { clubId: true, name: true, slug: true } },
        category: { select: { categoryId: true, name: true } },
      },
    });

    await syncEventEmbedding(created.eventId).catch(() => null);

    await logResourceActivity({
      actorUserId: user.userId,
      actorRole: user.role,
      action: "EVENT_CREATED",
      entityType: "EVENT",
      entityId: created.eventId,
      summary: `Created event "${created.title}" for club "${created.club.name}"`,
    });

    return NextResponse.json({ event: created }, { status: 201 });
  } catch (error) {
    console.error("POST /api/events error:", error);
    return NextResponse.json({ error: "Failed to create event" }, { status: 500 });
  }
}
