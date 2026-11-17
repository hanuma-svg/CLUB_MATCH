import { NextRequest, NextResponse } from "next/server";
import { semanticSearchCatalog } from "@/lib/recommendations";
import { getEmbeddingStatus } from "@/lib/embeddings";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() || "";
  if (!q) {
    return NextResponse.json({
      embeddingStatus: getEmbeddingStatus(),
      semanticAvailable: getEmbeddingStatus().configured,
      clubs: [],
      events: [],
    });
  }

  try {
    const result = await semanticSearchCatalog(q, 10);
    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /api/search/semantic error:", error);
    return NextResponse.json({ error: "Semantic search failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { query?: string; limit?: number };
    const query = body.query?.trim() || "";
    if (!query) {
      return NextResponse.json({ error: "query is required" }, { status: 400 });
    }
    const result = await semanticSearchCatalog(query, Math.min(20, Math.max(1, body.limit || 10)));
    return NextResponse.json(result);
  } catch (error) {
    console.error("POST /api/search/semantic error:", error);
    return NextResponse.json({ error: "Semantic search failed" }, { status: 500 });
  }
}
