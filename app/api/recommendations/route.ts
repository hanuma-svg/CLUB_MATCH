import { NextResponse } from "next/server";
import { requireRole } from "@/lib/rbac";
import {
  getRecommendedClubsForStudent,
  getRecommendedEventsForStudent,
  syncStudentEmbedding,
} from "@/lib/recommendations";
import { getEmbeddingStatus } from "@/lib/embeddings";

export async function GET() {
  const { user, errorResponse } = await requireRole(["STUDENT"]);
  if (errorResponse || !user || !user.studentId) {
    return errorResponse ?? NextResponse.json({ error: "Student profile not found" }, { status: 404 });
  }

  try {
    const [clubs, events] = await Promise.all([
      getRecommendedClubsForStudent(user.studentId, 8),
      getRecommendedEventsForStudent(user.studentId, 6),
    ]);

    return NextResponse.json({
      embeddingStatus: getEmbeddingStatus(),
      clubs,
      events,
    });
  } catch (error) {
    console.error("GET /api/recommendations error:", error);
    return NextResponse.json({ error: "Failed to load recommendations" }, { status: 500 });
  }
}

export async function POST() {
  const { user, errorResponse } = await requireRole(["STUDENT"]);
  if (errorResponse || !user || !user.studentId) {
    return errorResponse ?? NextResponse.json({ error: "Student profile not found" }, { status: 404 });
  }

  try {
    const syncResult = await syncStudentEmbedding(user.studentId);
    const [clubs, events] = await Promise.all([
      getRecommendedClubsForStudent(user.studentId, 8),
      getRecommendedEventsForStudent(user.studentId, 6),
    ]);

    return NextResponse.json({
      syncResult,
      embeddingStatus: getEmbeddingStatus(),
      clubs,
      events,
    });
  } catch (error) {
    console.error("POST /api/recommendations error:", error);
    return NextResponse.json({ error: "Failed to refresh recommendations" }, { status: 500 });
  }
}
