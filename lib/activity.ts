import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function logResourceActivity(params: {
  actorUserId?: string | null;
  actorRole: string;
  action: string;
  entityType: string;
  entityId: string;
  summary: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    await prisma.resourceActivity.create({
      data: {
        actorUserId: params.actorUserId ?? null,
        actorRole: params.actorRole,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        summary: params.summary,
        metadata: (params.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
  } catch (err) {
    console.error("Failed to record resource activity:", err);
  }
}
