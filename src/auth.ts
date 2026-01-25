import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import Credentials from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { z } from "zod"
import type { Role } from "@prisma/client"

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

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

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma) as any,
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
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const result = credentialsSchema.safeParse(credentials)

        if (!result.success) {
          throw new Error("Invalid credentials")
        }

        const { email, password } = result.data

        const user = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            name: true,
            image: true,
            role: true,
            password: true,
          },
        })

        if (!user || !user.password) {
          throw new Error("Invalid email or password")
        }

        const isPasswordValid = await bcrypt.compare(password, user.password)

        if (!isPasswordValid) {
          throw new Error("Invalid email or password")
        }

        return {
          id: user.id.toString(),
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id
        token.role = user.role
      }

      // Handle session updates
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
  },
  events: {
    async signIn({ user, account, profile, isNewUser }) {
      // Audit logging for HIPAA compliance
      console.log(`[AUTH] Sign in: ${user.email} via ${account?.provider}`, {
        userId: user.id,
        provider: account?.provider,
        isNewUser,
        timestamp: new Date().toISOString(),
      })
    },
    async signOut(params) {
      // Audit logging for HIPAA compliance
      const token = 'token' in params ? params.token : null
      console.log(`[AUTH] Sign out: ${token?.email || 'unknown'}`, {
        userId: token?.id || 'unknown',
        timestamp: new Date().toISOString(),
      })
    },
  },
})
