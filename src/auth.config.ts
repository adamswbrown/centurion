import Google from "next-auth/providers/google"
import Apple from "next-auth/providers/apple"
import Credentials from "next-auth/providers/credentials"
import type { NextAuthConfig } from "next-auth"
import type { Role } from "@prisma/client"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      email: string
      name?: string | null
      image?: string | null
      role: Role
    }
  }

  interface User {
    role: Role
  }
}

export default {
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
    ...(process.env.APPLE_CLIENT_ID && process.env.APPLE_CLIENT_SECRET
      ? [
          Apple({
            clientId: process.env.APPLE_CLIENT_ID,
            clientSecret: process.env.APPLE_CLIENT_SECRET,
          }),
        ]
      : []),
    // Credentials provider is added in auth.ts (not here) to avoid
    // pulling bcrypt + Prisma into the Edge middleware bundle.
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: () => null, // Overridden in auth.ts
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id
        token.role = user.role
      }
      if (trigger === "update" && session) {
        token.name = session.name
        token.email = session.email
      }
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as Role
      }
      return session
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const userRole = auth?.user?.role

      // Public routes
      const publicRoutes = ["/", "/login", "/register", "/api/auth", "/forgot-password", "/reset-password", "/legal"]
      const isPublicRoute = publicRoutes.some((route) =>
        nextUrl.pathname.startsWith(route)
      )

      // API routes that need external access
      if (nextUrl.pathname.startsWith("/api/webhooks") ||
          nextUrl.pathname.startsWith("/api/healthkit") ||
          nextUrl.pathname.startsWith("/api/health")) {
        return true
      }

      // Public routes are always accessible
      if (isPublicRoute) {
        return true
      }

      // Redirect unauthenticated users to login
      if (!isLoggedIn) {
        return false
      }

      // Admin-only routes
      const adminRoutes = ["/admin", "/billing"]
      const isAdminRoute = adminRoutes.some((route) =>
        nextUrl.pathname.startsWith(route)
      )

      if (isAdminRoute && userRole !== "ADMIN") {
        return Response.redirect(new URL("/dashboard", nextUrl))
      }

      // Coach routes (ADMIN and COACH)
      const coachRoutes = ["/dashboard", "/members", "/appointments", "/sessions", "/cohorts", "/invoices"]
      const isCoachRoute = coachRoutes.some((route) =>
        nextUrl.pathname.startsWith(route)
      )

      const isClientSelfRoute =
        nextUrl.pathname.startsWith("/appointments/me") ||
        nextUrl.pathname.startsWith("/cohorts/me") ||
        nextUrl.pathname.startsWith("/invoices/me")

      if (isCoachRoute && userRole === "CLIENT" && !isClientSelfRoute) {
        return Response.redirect(new URL("/client/dashboard", nextUrl))
      }

      return true
    },
  },
  events: {
    async signIn({ user, account }) {
      console.log(`[AUTH] Sign in: ${user.email} via ${account?.provider}`, {
        userId: user.id,
        provider: account?.provider,
        timestamp: new Date().toISOString(),
      })
    },
    async signOut(params) {
      const token = 'token' in params ? params.token : null
      console.log(`[AUTH] Sign out: ${token?.email || 'unknown'}`, {
        userId: token?.id || 'unknown',
        timestamp: new Date().toISOString(),
      })
    },
  },
} satisfies NextAuthConfig
