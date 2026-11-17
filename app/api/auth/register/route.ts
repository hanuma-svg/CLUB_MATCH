import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validations";
import { logResourceActivity } from "@/lib/activity";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { fullName, email, password, srn, department, semester, campus } = parsed.data;

    const existingUser = await prisma.userAccount.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      );
    }

    if (srn) {
      const existingSrn = await prisma.student.findUnique({ where: { srn } });
      if (existingSrn) {
        return NextResponse.json(
          { error: "This SRN is already registered." },
          { status: 409 }
        );
      }
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // Public registration strictly assigns STUDENT role regardless of payload
    const created = await prisma.$transaction(async (tx) => {
      const user = await tx.userAccount.create({
        data: {
          email,
          passwordHash,
          fullName,
          role: "STUDENT",
          isActive: true,
        },
      });

      const student = await tx.student.create({
        data: {
          userId: user.userId,
          email,
          srn: srn || null,
          department: department || null,
          semester: semester ?? null,
          campus: campus || "PES University EC Campus",
          onboardingCompleted: false,
        },
      });

      return { user, student };
    });

    await logResourceActivity({
      actorUserId: created.user.userId,
      actorRole: "STUDENT",
      action: "STUDENT_REGISTERED",
      entityType: "STUDENT",
      entityId: created.student.studentId,
      summary: `New student registered: ${fullName} (${email})`,
    });

    return NextResponse.json(
      {
        message: "Registration successful",
        user: {
          userId: created.user.userId,
          email: created.user.email,
          fullName: created.user.fullName,
          role: created.user.role,
          studentId: created.student.studentId,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json({ error: "Unable to register student" }, { status: 500 });
  }
}
