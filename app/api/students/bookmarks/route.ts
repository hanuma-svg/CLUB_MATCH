import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";

const bookmarkSchema = z.object({
  clubId: z.string().min(1),
});

export async function GET() {
  const { user, errorResponse } = await requireRole(["STUDENT"]);
  if (errorResponse || !user || !user.studentId) {
    return errorResponse ?? NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  const bookmarks = await prisma.bookmarkedClub.findMany({
    where: { studentId: user.studentId },
    include: {
      club: {
        include: {
          interests: { include: { interest: true } },
          _count: { select: { events: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    bookmarks: bookmarks.map((b) => ({
      createdAt: b.createdAt,
      club: b.club,
    })),
  });
}

export async function POST(req: NextRequest) {
  const { user, errorResponse } = await requireRole(["STUDENT"]);
  if (errorResponse || !user || !user.studentId) {
    return errorResponse ?? NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  try {
    const body = await req.json();
    const parsed = bookmarkSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "clubId is required" }, { status: 400 });
    }

    const { clubId } = parsed.data;
    const club = await prisma.club.findUnique({ where: { clubId } });
    if (!club) {
      return NextResponse.json({ error: "Club not found" }, { status: 404 });
    }

    const existing = await prisma.bookmarkedClub.findUnique({
      where: { studentId_clubId: { studentId: user.studentId, clubId } },
    });

    if (existing) {
      await prisma.bookmarkedClub.delete({
        where: { studentId_clubId: { studentId: user.studentId, clubId } },
      });
      return NextResponse.json({ bookmarked: false, clubId });
    }

    await prisma.bookmarkedClub.create({
      data: { studentId: user.studentId, clubId },
    });

    return NextResponse.json({ bookmarked: true, clubId }, { status: 201 });
  } catch (error) {
    console.error("Bookmark toggle error:", error);
    return NextResponse.json({ error: "Failed to toggle bookmark" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const { user, errorResponse } = await requireRole(["STUDENT"]);
  if (errorResponse || !user || !user.studentId) {
    return errorResponse ?? NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  const clubId = req.nextUrl.searchParams.get("clubId");
  if (!clubId) {
    return NextResponse.json({ error: "clubId query parameter is required" }, { status: 400 });
  }

  await prisma.bookmarkedClub.deleteMany({
    where: { studentId: user.studentId, clubId },
  });

  return NextResponse.json({ bookmarked: false, clubId });
}
