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
  await prisma.auditLog.create({
    data: {
      action,
      actorId,
      targetId,
      targetType,
      details: details ? JSON.stringify(details) : undefined,
    },
  })
}
