import { NextRequest, NextResponse } from "next/server";
import type { ClubCategory, ClubStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentSessionUser, requireRole } from "@/lib/rbac";
import { createClubSchema } from "@/lib/validations";
import { slugify } from "@/lib/slug";
import { syncClubEmbedding } from "@/lib/recommendations";
import { logResourceActivity } from "@/lib/activity";

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const q = sp.get("q")?.trim() || "";
    const category = sp.get("category") || "";
    const interest = sp.get("interest") || "";
    const campus = sp.get("campus") || "";
    const sort = sp.get("sort") || "featured";
    const includeAllStatuses = sp.get("allStatuses") === "true";

    const currentUser = await getCurrentSessionUser();
    const canSeeAllStatuses = includeAllStatuses && currentUser?.role === "ADMIN";

    const where: Prisma.ClubWhereInput = {
      ...(canSeeAllStatuses ? {} : { status: "ACTIVE" as ClubStatus }),
      ...(category && category !== "ALL" ? { category: category as ClubCategory } : {}),
      ...(campus && campus !== "ALL" ? { campus } : {}),
      ...(interest
        ? {
            interests: {
              some: {
                interest: {
                  OR: [{ interestId: interest }, { slug: interest }, { name: { equals: interest, mode: "insensitive" } }],
                },
              },
            },
          }
        : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { tagline: { contains: q, mode: "insensitive" } },
              { description: { contains: q, mode: "insensitive" } },
              { activities: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const orderBy: Prisma.ClubOrderByWithRelationInput[] =
      sort === "popular"
        ? [{ memberCount: "desc" }, { bookmarks: { _count: "desc" } }, { name: "asc" }]
        : sort === "name"
          ? [{ name: "asc" }]
          : sort === "newest"
            ? [{ createdAt: "desc" }]
            : [{ isFeatured: "desc" }, { memberCount: "desc" }, { name: "asc" }];

    const clubs = await prisma.club.findMany({
      where,
      orderBy,
      include: {
        interests: { include: { interest: true } },
        _count: {
          select: {
            events: true,
            bookmarks: true,
            memberships: true,
          },
        },
      },
    });

    return NextResponse.json({ clubs, total: clubs.length });
  } catch (error) {
    console.error("GET /api/clubs error:", error);
    return NextResponse.json({ error: "Failed to load clubs" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { user, errorResponse } = await requireRole(["ADMIN", "CLUB_COORDINATOR"]);
  if (errorResponse || !user) return errorResponse!;

  try {
    const body = await req.json();
    const parsed = createClubSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const slug = slugify(data.name);

    const existing = await prisma.club.findFirst({
      where: { OR: [{ name: data.name }, { slug }] },
    });
    if (existing) {
      return NextResponse.json({ error: "A club with this name already exists" }, { status: 409 });
    }

    const initialStatus: ClubStatus = user.role === "ADMIN" ? "ACTIVE" : "PENDING";

    const created = await prisma.$transaction(async (tx) => {
      const club = await tx.club.create({
        data: {
          name: data.name,
          slug,
          category: data.category,
          campus: data.campus,
          tagline: data.tagline ?? null,
          description: data.description,
          activities: data.activities,
          logoUrl: data.logoUrl || null,
          bannerUrl: data.bannerUrl || null,
          isSampleDescription: data.isSampleDescription ?? false,
          verifiedCoordinatorName: data.verifiedCoordinatorName ?? null,
          verifiedEmail: data.verifiedEmail || null,
          isFeatured: user.role === "ADMIN" ? Boolean(data.isFeatured) : false,
          status: initialStatus,
          adminId: user.adminId ?? null,
        },
      });

      if (data.interestIds?.length) {
        await tx.clubInterest.createMany({
          data: [...new Set(data.interestIds)].map((interestId) => ({
            clubId: club.clubId,
            interestId,
            weight: 2,
          })),
        });
      }

      if (user.role === "CLUB_COORDINATOR" && user.coordinatorId) {
        await tx.clubCoordinatorAssignment.create({
          data: {
            coordinatorId: user.coordinatorId,
            clubId: club.clubId,
            title: "Submitting Coordinator",
          },
        });
      }

      return club;
    });

    await syncClubEmbedding(created.clubId).catch(() => null);

    await logResourceActivity({
      actorUserId: user.userId,
      actorRole: user.role,
      action: user.role === "ADMIN" ? "CLUB_CREATED" : "CLUB_SUBMITTED",
      entityType: "CLUB",
      entityId: created.clubId,
      summary: `${user.role} created club "${created.name}" (${created.status})`,
    });

    return NextResponse.json({ club: created }, { status: 201 });
  } catch (error) {
    console.error("POST /api/clubs error:", error);
    return NextResponse.json({ error: "Failed to create club" }, { status: 500 });
  }
}
