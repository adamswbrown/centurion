import { auth } from "@/auth"
import { redirect } from "next/navigation"
import type { Role } from "@prisma/client"

export async function getSession() {
  const session = await auth()
  return session
}

export async function getCurrentUser() {
  const session = await getSession()
  return session?.user
}

export async function requireAuth() {
  const session = await getSession()

  if (!session?.user) {
    redirect("/login")
  }

  return session.user
}

export async function requireRole(allowedRoles: Role[]) {
  const user = await requireAuth()

  if (!allowedRoles.includes(user.role)) {
    redirect("/dashboard")
  }

  return user
}

export async function requireAdmin() {
  return requireRole(["ADMIN"])
}

export async function requireCoach() {
  return requireRole(["ADMIN", "COACH"])
}
