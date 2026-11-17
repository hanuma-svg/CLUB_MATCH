import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { createInterestSchema } from "@/lib/validations";
import { slugify } from "@/lib/slug";

export async function GET(req: NextRequest) {
  try {
    const category = req.nextUrl.searchParams.get("category");
    const interests = await prisma.interest.findMany({
      where: category ? { category: category as never } : undefined,
      orderBy: [{ category: "asc" }, { name: "asc" }],
      include: {
        _count: {
          select: { clubs: true, students: true },
        },
      },
    });

    return NextResponse.json({ interests });
  } catch (error) {
    console.error("Error fetching interests:", error);
    return NextResponse.json({ error: "Failed to load interests" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { user, errorResponse } = await requireRole(["ADMIN"]);
  if (errorResponse || !user) return errorResponse!;

  try {
    const body = await req.json();
    const parsed = createInterestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const slug = slugify(parsed.data.name);
    const existing = await prisma.interest.findFirst({
      where: { OR: [{ name: parsed.data.name }, { slug }] },
    });
    if (existing) {
      return NextResponse.json({ error: "Interest already exists" }, { status: 409 });
    }

    const interest = await prisma.interest.create({
      data: {
        name: parsed.data.name,
        slug,
        category: parsed.data.category,
        description: parsed.data.description ?? null,
        iconName: parsed.data.iconName ?? "Sparkles",
      },
    });

    return NextResponse.json({ interest }, { status: 201 });
  } catch (error) {
    console.error("Create interest error:", error);
    return NextResponse.json({ error: "Failed to create interest" }, { status: 500 });
  }
}
