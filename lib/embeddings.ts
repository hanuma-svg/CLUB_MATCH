export type EmbeddingProvider = "gemini" | "openai" | "ollama";

export interface EmbeddingStatus {
  configured: boolean;
  provider: EmbeddingProvider | null;
  model: string | null;
  dimensions: number;
  reason?: string;
}

export interface EmbeddingResult {
  available: boolean;
  embedding: number[] | null;
  provider: EmbeddingProvider | null;
  model: string | null;
  error?: string;
}

const TARGET_DIMENSIONS = Number(process.env.EMBEDDING_DIMENSIONS || 768);

export function getEmbeddingStatus(): EmbeddingStatus {
  const preferred = (process.env.EMBEDDING_PROVIDER || "").toLowerCase() as EmbeddingProvider | "";

  if (preferred === "openai" && process.env.OPENAI_API_KEY) {
    return {
      configured: true,
      provider: "openai",
      model: "text-embedding-3-small",
      dimensions: TARGET_DIMENSIONS,
    };
  }

  if (preferred === "ollama" && process.env.OLLAMA_BASE_URL) {
    return {
      configured: true,
      provider: "ollama",
      model: process.env.OLLAMA_EMBEDDING_MODEL || "nomic-embed-text",
      dimensions: TARGET_DIMENSIONS,
    };
  }

  if (process.env.GEMINI_API_KEY) {
    return {
      configured: true,
      provider: "gemini",
      model: "gemini-embedding-001",
      dimensions: TARGET_DIMENSIONS,
    };
  }

  if (process.env.OPENAI_API_KEY) {
    return {
      configured: true,
      provider: "openai",
      model: "text-embedding-3-small",
      dimensions: TARGET_DIMENSIONS,
    };
  }

  if (process.env.OLLAMA_BASE_URL && preferred === "ollama") {
    return {
      configured: true,
      provider: "ollama",
      model: process.env.OLLAMA_EMBEDDING_MODEL || "nomic-embed-text",
      dimensions: TARGET_DIMENSIONS,
    };
  }

  return {
    configured: false,
    provider: null,
    model: null,
    dimensions: TARGET_DIMENSIONS,
    reason:
      "No embedding API key is configured (set GEMINI_API_KEY, OPENAI_API_KEY, or EMBEDDING_PROVIDER=ollama with a running Ollama server).",
  };
}

export function formatVectorLiteral(values: number[]): string {
  if (!Array.isArray(values) || values.length !== TARGET_DIMENSIONS) {
    throw new Error(`Expected ${TARGET_DIMENSIONS}-dimensional vector, got ${values?.length ?? 0}`);
  }
  const sanitized = values.map((v) => {
    if (typeof v !== "number" || !Number.isFinite(v)) {
      throw new Error("Vector contains non-finite numeric value");
    }
    return v.toFixed(8);
  });
  return `[${sanitized.join(",")}]`;
}

export async function generateEmbedding(text: string): Promise<EmbeddingResult> {
  const cleanText = text.trim();
  if (!cleanText) {
    return {
      available: false,
      embedding: null,
      provider: null,
      model: null,
      error: "Cannot generate embedding from empty text.",
    };
  }

  const status = getEmbeddingStatus();
  if (!status.configured || !status.provider) {
    return {
      available: false,
      embedding: null,
      provider: null,
      model: null,
      error: status.reason,
    };
  }

  try {
    if (status.provider === "gemini") {
      const apiKey = process.env.GEMINI_API_KEY!;
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${encodeURIComponent(
          apiKey
        )}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "models/gemini-embedding-001",
            content: { parts: [{ text: cleanText }] },
            outputDimensionality: TARGET_DIMENSIONS,
          }),
        }
      );

      if (!res.ok) {
        const body = await res.text();
        return {
          available: false,
          embedding: null,
          provider: "gemini",
          model: status.model,
          error: `Gemini Embedding API error (${res.status}): ${body.slice(0, 200)}`,
        };
      }

      const data = (await res.json()) as { embedding?: { values?: number[] } };
      const values = data.embedding?.values;
      if (!values || values.length !== TARGET_DIMENSIONS) {
        return {
          available: false,
          embedding: null,
          provider: "gemini",
          model: status.model,
          error: `Unexpected Gemini embedding dimension: ${values?.length ?? 0}`,
        };
      }

      return {
        available: true,
        embedding: values,
        provider: "gemini",
        model: status.model,
      };
    }

    if (status.provider === "openai") {
      const apiKey = process.env.OPENAI_API_KEY!;
      const res = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "text-embedding-3-small",
          input: cleanText,
          dimensions: TARGET_DIMENSIONS,
        }),
      });

      if (!res.ok) {
        const body = await res.text();
        return {
          available: false,
          embedding: null,
          provider: "openai",
          model: status.model,
          error: `OpenAI Embedding API error (${res.status}): ${body.slice(0, 200)}`,
        };
      }

      const data = (await res.json()) as { data?: Array<{ embedding?: number[] }> };
      const values = data.data?.[0]?.embedding;
      if (!values || values.length !== TARGET_DIMENSIONS) {
        return {
          available: false,
          embedding: null,
          provider: "openai",
          model: status.model,
          error: `Unexpected OpenAI embedding dimension: ${values?.length ?? 0}`,
        };
      }

      return {
        available: true,
        embedding: values,
        provider: "openai",
        model: status.model,
      };
    }

    // Ollama local embeddings
    const baseUrl = (process.env.OLLAMA_BASE_URL || "http://localhost:11434").replace(/\/$/, "");
    const model = status.model || "nomic-embed-text";
    const res = await fetch(`${baseUrl}/api/embeddings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, prompt: cleanText }),
    });

    if (!res.ok) {
      const body = await res.text();
      return {
        available: false,
        embedding: null,
        provider: "ollama",
        model,
        error: `Ollama Embedding API error (${res.status}): ${body.slice(0, 200)}`,
      };
    }

    const data = (await res.json()) as { embedding?: number[] };
    const values = data.embedding;
    if (!values || values.length !== TARGET_DIMENSIONS) {
      return {
        available: false,
        embedding: null,
        provider: "ollama",
        model,
        error: `Unexpected Ollama embedding dimension: ${values?.length ?? 0}`,
      };
    }

    return {
      available: true,
      embedding: values,
      provider: "ollama",
      model,
    };
  } catch (err) {
    return {
      available: false,
      embedding: null,
      provider: status.provider,
      model: status.model,
      error: err instanceof Error ? err.message : "Unknown embedding request error",
    };
  }
}

export function buildClubEmbeddingText(club: {
  name: string;
  category: string;
  tagline?: string | null;
  description: string;
  activities: string;
  interests?: string[];
}): string {
  return [
    `Club: ${club.name}`,
    `Category: ${club.category.replace(/_/g, " ")}`,
    club.tagline ? `Tagline: ${club.tagline}` : "",
    `Description: ${club.description}`,
    `Activities: ${club.activities}`,
    club.interests?.length ? `Topics: ${club.interests.join(", ")}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildEventEmbeddingText(event: {
  title: string;
  description: string;
  categoryName?: string;
  clubName?: string;
  venue?: string;
}): string {
  return [
    `Event: ${event.title}`,
    event.categoryName ? `Category: ${event.categoryName}` : "",
    event.clubName ? `Organizing Club: ${event.clubName}` : "",
    event.venue ? `Venue: ${event.venue}` : "",
    `Description: ${event.description}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildStudentInterestText(interests: Array<{ name: string; category: string }>, bio?: string | null): string {
  const interestLines = interests.map((i) => `${i.name} (${i.category})`).join(", ");
  return [
    `Student Interests: ${interestLines}`,
    bio ? `Student Bio: ${bio}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}
