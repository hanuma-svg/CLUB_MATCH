import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { getEmbeddingStatus } from "@/lib/embeddings";
import { syncClubEmbedding, syncEventEmbedding, syncStudentEmbedding } from "@/lib/recommendations";
import { logResourceActivity } from "@/lib/activity";

export async function POST() {
  const { user, errorResponse } = await requireRole(["ADMIN"]);
  if (errorResponse || !user) return errorResponse!;

  const status = getEmbeddingStatus();
  if (!status.configured) {
    return NextResponse.json(
      {
        error: "Embedding provider is not configured",
        embeddingStatus: status,
      },
      { status: 400 }
    );
  }

  try {
    const [clubs, events, students] = await Promise.all([
      prisma.club.findMany({ select: { clubId: true } }),
      prisma.event.findMany({ select: { eventId: true } }),
      prisma.student.findMany({
        where: { interests: { some: {} } },
        select: { studentId: true },
      }),
    ]);

    let clubsSynced = 0;
    let eventsSynced = 0;
    let studentsSynced = 0;

    for (const c of clubs) {
      const r = await syncClubEmbedding(c.clubId);
      if (r.synced) clubsSynced++;
    }
    for (const e of events) {
      const r = await syncEventEmbedding(e.eventId);
      if (r.synced) eventsSynced++;
    }
    for (const s of students) {
      const r = await syncStudentEmbedding(s.studentId);
      if (r.synced) studentsSynced++;
    }

    await logResourceActivity({
      actorUserId: user.userId,
      actorRole: user.role,
      action: "EMBEDDINGS_SYNCED",
      entityType: "SYSTEM",
      entityId: "pgvector",
      summary: `Admin synced pgvector embeddings (${clubsSynced} clubs, ${eventsSynced} events, ${studentsSynced} students)`,
    });

    return NextResponse.json({
      provider: status.provider,
      model: status.model,
      clubsSynced,
      totalClubs: clubs.length,
      eventsSynced,
      totalEvents: events.length,
      studentsSynced,
      totalStudents: students.length,
    });
  } catch (error) {
    console.error("POST /api/embeddings/sync error:", error);
    return NextResponse.json({ error: "Failed to sync embeddings" }, { status: 500 });
  }
}
