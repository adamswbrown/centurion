"use server"

import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { randomBytes } from "crypto"
import bcrypt from "bcryptjs"
import { sendSystemEmail } from "@/lib/email"
import { EMAIL_TEMPLATE_KEYS } from "@/lib/email-templates"

const requestResetSchema = z.object({
  email: z.string().email(),
})

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Must contain uppercase letter")
    .regex(/[a-z]/, "Must contain lowercase letter")
    .regex(/[0-9]/, "Must contain a number"),
})

export async function requestPasswordReset(input: z.infer<typeof requestResetSchema>) {
  const result = requestResetSchema.safeParse(input)
  if (!result.success) {
    return { error: result.error.errors[0].message }
  }

  const { email } = result.data

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, password: true, isTestUser: true },
  })

  // Only process if user exists and has a password (not OAuth-only)
  if (user && user.password) {
    const token = randomBytes(32).toString("hex")

    // Delete any existing tokens for this email
    await prisma.verificationToken.deleteMany({
      where: { identifier: email },
    })

    // Create new token with 1-hour expiry
    await prisma.verificationToken.create({
      data: {
        identifier: email,
        token,
        expires: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    })

    const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    const resetUrl = `${baseUrl}/reset-password?token=${token}`

    await sendSystemEmail({
      templateKey: EMAIL_TEMPLATE_KEYS.PASSWORD_RESET,
      to: email,
      variables: {
        userName: user.name || "there",
        resetUrl,
      },
      isTestUser: user.isTestUser,
    })
  }

  // Always return success to prevent email enumeration
  return { success: true }
}

export async function validateResetToken(token: string) {
  const verificationToken = await prisma.verificationToken.findUnique({
    where: { token },
  })

  if (!verificationToken) {
    return { valid: false }
  }

  if (verificationToken.expires < new Date()) {
    // Clean up expired token
    await prisma.verificationToken.delete({
      where: { token },
    })
    return { valid: false }
  }

  return { valid: true, email: verificationToken.identifier }
}

export async function resetPassword(input: z.infer<typeof resetPasswordSchema>) {
  const result = resetPasswordSchema.safeParse(input)
  if (!result.success) {
    return { error: result.error.errors[0].message }
  }

  const { token, password } = result.data

  // Find and validate token
  const verificationToken = await prisma.verificationToken.findUnique({
    where: { token },
  })

  if (!verificationToken || verificationToken.expires < new Date()) {
    return { error: "Invalid or expired reset token. Please request a new one." }
  }

  const email = verificationToken.identifier

  // Find the user
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  })

  if (!user) {
    return { error: "User not found." }
  }

  // Hash new password
  const hashedPassword = await bcrypt.hash(password, 12)

  // Update user password
  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashedPassword },
  })

  // Delete the used token and any other tokens for this email
  await prisma.verificationToken.deleteMany({
    where: { identifier: email },
  })

  return { success: true }
}
