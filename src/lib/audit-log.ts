import { prisma } from "@/lib/prisma"

export async function logAuditEvent({
  action,
  actorId,
  targetId,
  targetType,
  details,
}: {
  action: string
  actorId: number
  targetId?: number
  targetType?: string
  details?: any
}) {
  // Map to schema fields: actorId -> userId, targetId/targetType -> target, details -> metadata
  const target = targetType && targetId ? `${targetType}:${targetId}` : undefined

  await prisma.auditLog.create({
    data: {
      action,
      userId: actorId,
      target,
      metadata: details || undefined,
    },
  })
}
