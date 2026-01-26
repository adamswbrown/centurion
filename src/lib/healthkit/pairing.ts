/**
 * Pairing code utilities for iOS app HealthKit integration.
 * Generates and validates 6-character alphanumeric codes for device pairing.
 */

import { prisma } from "@/lib/prisma"

// Characters used for pairing codes (excludes ambiguous characters like 0, O, I, l)
const PAIRING_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
const PAIRING_CODE_LENGTH = 6
const PAIRING_CODE_EXPIRY_HOURS = 24

/**
 * Generate a random pairing code
 */
export function generatePairingCode(): string {
  let code = ""
  for (let i = 0; i < PAIRING_CODE_LENGTH; i++) {
    const randomIndex = Math.floor(Math.random() * PAIRING_CODE_CHARS.length)
    code += PAIRING_CODE_CHARS[randomIndex]
  }
  return code
}

/**
 * Generate expiration time for a pairing code
 */
export function generateExpirationTime(hours: number = PAIRING_CODE_EXPIRY_HOURS): Date {
  const expiresAt = new Date()
  expiresAt.setHours(expiresAt.getHours() + hours)
  return expiresAt
}

/**
 * Check if a pairing code format is valid
 */
export function isValidCodeFormat(code: string): boolean {
  if (!code || code.length !== PAIRING_CODE_LENGTH) {
    return false
  }
  return code.split("").every((char) => PAIRING_CODE_CHARS.includes(char.toUpperCase()))
}

/**
 * Create a new pairing code for a client
 */
export async function createPairingCode(createdBy: number, clientId: number) {
  // Verify client exists
  const client = await prisma.user.findUnique({
    where: { id: clientId },
    select: { id: true, role: true },
  })

  if (!client) {
    throw new Error("Client not found")
  }

  if (client.role !== "CLIENT") {
    throw new Error("User is not a client")
  }

  // Generate a unique code (retry if collision)
  let code: string
  let attempts = 0
  const maxAttempts = 10

  do {
    code = generatePairingCode()
    const existing = await prisma.pairingCode.findUnique({ where: { code } })
    if (!existing) break
    attempts++
  } while (attempts < maxAttempts)

  if (attempts >= maxAttempts) {
    throw new Error("Failed to generate unique pairing code")
  }

  const expiresAt = generateExpirationTime()

  return prisma.pairingCode.create({
    data: {
      code,
      userId: clientId,
      createdBy,
      expiresAt,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  })
}

/**
 * Regenerate a pairing code for a client (invalidates previous codes)
 */
export async function regeneratePairingCode(createdBy: number, clientId: number) {
  // Invalidate any existing unused codes for this client
  await prisma.pairingCode.updateMany({
    where: {
      userId: clientId,
      usedAt: null,
    },
    data: {
      expiresAt: new Date(0),
    },
  })

  return createPairingCode(createdBy, clientId)
}

/**
 * Validate and use a pairing code
 */
export async function validateAndUsePairingCode(
  code: string
): Promise<{ success: true; userId: number; pairingCode: unknown } | { success: false; error: string }> {
  if (!isValidCodeFormat(code)) {
    return { success: false, error: "Invalid code format" }
  }

  const normalizedCode = code.toUpperCase()

  const pairingCode = await prisma.pairingCode.findUnique({
    where: { code: normalizedCode },
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
    },
  })

  if (!pairingCode) {
    return { success: false, error: "Pairing code not found" }
  }

  if (pairingCode.usedAt) {
    return { success: false, error: "Pairing code has already been used" }
  }

  if (new Date() > pairingCode.expiresAt) {
    return { success: false, error: "Pairing code has expired" }
  }

  // Mark as used
  const updatedCode = await prisma.pairingCode.update({
    where: { id: pairingCode.id },
    data: { usedAt: new Date() },
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
    },
  })

  return {
    success: true,
    userId: pairingCode.userId,
    pairingCode: updatedCode,
  }
}

/**
 * Get all active (unused, unexpired) pairing codes
 */
export async function getActivePairingCodes(createdBy?: number) {
  return prisma.pairingCode.findMany({
    where: {
      usedAt: null,
      expiresAt: { gt: new Date() },
      ...(createdBy ? { createdBy } : {}),
    },
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: { createdAt: "desc" },
  })
}

/**
 * Clean up expired pairing codes
 */
export async function cleanupExpiredCodes(): Promise<number> {
  const result = await prisma.pairingCode.deleteMany({
    where: {
      expiresAt: { lt: new Date() },
      usedAt: null,
    },
  })
  return result.count
}
