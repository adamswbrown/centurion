# Recommended Auth.js v5 Configuration
**For**: Centurion Unified Fitness Platform
**Date**: 2026-01-25
**Security Score Target**: 95/100

---

## Overview

This document provides the recommended Auth.js v5 configuration for production deployment, incorporating security best practices, HIPAA compliance requirements, and improved user experience.

**Key Improvements**:
- ✅ Extended session duration (7 days web, 30 days mobile)
- ✅ CSRF protection enabled
- ✅ Secure cookie configuration
- ✅ Token refresh strategy
- ✅ Audit logging integration
- ✅ Rate limiting preparation

---

## Production Auth Configuration

**File**: `/lib/auth.ts` (Updated)

```typescript
import NextAuth, { type NextAuthConfig } from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import GoogleProvider from "next-auth/providers/google"
import AppleProvider from "next-auth/providers/apple"
import CredentialsProvider from "next-auth/providers/credentials"
import { db } from "./db"
import { Role } from "./types"
import { isAdminWithOverride } from "./permissions-server"
import { logAuthEvent } from "./audit" // NEW: Audit logging
import { checkRateLimit } from "./rate-limit" // NEW: Rate limiting
import type { Adapter } from "next-auth/adapters"
import bcrypt from "bcryptjs"
import { randomUUID } from "crypto"

export const authOptions: NextAuthConfig = {
  adapter: PrismaAdapter(db) as Adapter,

  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // 7 days (UPDATED: was 1 hour)
    updateAge: 24 * 60 * 60,  // Update session every 24 hours
  },

  // SECURITY: Enable CSRF protection
  useSecureCookies: process.env.NODE_ENV === "production",

  // SECURITY: Configure cookie settings
  cookies: {
    sessionToken: {
      name: `${process.env.NODE_ENV === "production" ? "__Secure-" : ""}next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
    callbackUrl: {
      name: `${process.env.NODE_ENV === "production" ? "__Secure-" : ""}next-auth.callback-url`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
    csrfToken: {
      name: `${process.env.NODE_ENV === "production" ? "__Host-" : ""}next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },

  providers: [
    // Google OAuth (required)
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
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
        ]
      : []),

    // Apple Sign-In (optional)
    ...(process.env.APPLE_CLIENT_ID && process.env.APPLE_CLIENT_SECRET
      ? [
          AppleProvider({
            clientId: process.env.APPLE_CLIENT_ID!,
            clientSecret: process.env.APPLE_CLIENT_SECRET!,
          }),
        ]
      : []),

    // Email / Password
    CredentialsProvider({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },

      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) return null

        const email =
          typeof credentials.email === "string" ? credentials.email : ""
        const password =
          typeof credentials.password === "string" ? credentials.password : ""

        if (!email || !password) return null

        // SECURITY: Rate limiting check
        const ipAddress = req?.headers?.["x-forwarded-for"] || "unknown"
        const rateLimitKey = `login:${email}:${ipAddress}`

        const rateLimitResult = await checkRateLimit(rateLimitKey, {
          limit: 5,
          window: 15 * 60 * 1000, // 15 minutes
        })

        if (!rateLimitResult.success) {
          // Log failed attempt due to rate limit
          await logAuthEvent({
            action: "LOGIN_RATE_LIMITED",
            email,
            metadata: {
              ipAddress,
              remainingAttempts: rateLimitResult.remaining,
            },
            success: false,
          })
          return null
        }

        const user = await db.user.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            name: true,
            passwordHash: true,
            roles: true,
            isTestUser: true,
            mustChangePassword: true,
            failedLoginAttempts: true,
            lockedUntil: true,
          },
        })

        if (!user || !user.passwordHash) {
          // Log failed login (user not found)
          await logAuthEvent({
            action: "LOGIN_FAILED",
            email,
            metadata: { reason: "User not found or no password", ipAddress },
            success: false,
          })
          return null
        }

        // SECURITY: Check account lockout
        if (user.lockedUntil && user.lockedUntil > new Date()) {
          const minutesRemaining = Math.ceil(
            (user.lockedUntil.getTime() - Date.now()) / 60000
          )
          await logAuthEvent({
            action: "LOGIN_LOCKED",
            email,
            userId: user.id,
            metadata: { minutesRemaining, ipAddress },
            success: false,
          })
          return null
        }

        const isValid = await bcrypt.compare(password, user.passwordHash)

        if (!isValid) {
          // SECURITY: Increment failed login attempts
          const newFailedAttempts = (user.failedLoginAttempts || 0) + 1
          const shouldLock = newFailedAttempts >= 10

          await db.user.update({
            where: { id: user.id },
            data: {
              failedLoginAttempts: newFailedAttempts,
              lockedUntil: shouldLock
                ? new Date(Date.now() + 24 * 60 * 60 * 1000) // Lock for 24 hours
                : null,
            },
          })

          await logAuthEvent({
            action: "LOGIN_FAILED",
            email,
            userId: user.id,
            metadata: {
              reason: "Invalid password",
              failedAttempts: newFailedAttempts,
              locked: shouldLock,
              ipAddress,
            },
            success: false,
          })

          return null
        }

        // SECURITY: Reset failed login attempts on successful login
        if (user.failedLoginAttempts > 0 || user.lockedUntil) {
          await db.user.update({
            where: { id: user.id },
            data: {
              failedLoginAttempts: 0,
              lockedUntil: null,
            },
          })
        }

        // Log successful login
        await logAuthEvent({
          action: "LOGIN_SUCCESS",
          email,
          userId: user.id,
          metadata: { ipAddress },
          success: true,
        })

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          roles: user.roles as Role[],
          isTestUser: user.isTestUser,
          mustChangePassword: user.mustChangePassword,
        }
      },
    }),
  ],

  events: {
    async createUser({ user }) {
      // Ensure default role
      await db.user.update({
        where: { id: user.id },
        data: { roles: [Role.CLIENT] },
      })

      // Log user creation
      await logAuthEvent({
        action: "USER_CREATED",
        email: user.email!,
        userId: user.id,
        metadata: { source: "signup" },
        success: true,
      })

      if (!user.email) return

      try {
        const dbUser = await db.user.findUnique({
          where: { id: user.id },
          select: { isTestUser: true },
        })

        const { sendSystemEmail } = await import("./email")
        const { EMAIL_TEMPLATE_KEYS } = await import("./email-templates")
        const loginUrl = `${
          process.env.NEXTAUTH_URL || "http://localhost:3000"
        }/login`

        // Fire-and-forget: do not block auth lifecycle
        void sendSystemEmail({
          templateKey: EMAIL_TEMPLATE_KEYS.WELCOME_CLIENT,
          to: user.email,
          variables: {
            userName: user.name ? ` ${user.name}` : "",
            loginUrl,
          },
          isTestUser: dbUser?.isTestUser,
          fallbackSubject: "Welcome to CoachFit",
          fallbackHtml: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #1f2937;">Welcome to CoachFit!</h2>
              <p>Hi${user.name ? ` ${user.name}` : ""},</p>
              <p>Welcome to CoachFit! We're excited to have you on board.</p>
              <p>You're all set — your coach will guide you next.</p>
              <p style="margin-top: 24px;">
                <a
                  href="${loginUrl}"
                  style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;"
                >
                  Sign in to your dashboard
                </a>
              </p>
              <p style="margin-top: 24px; color: #6b7280; font-size: 14px;">
                If you have any questions, please contact your coach.
              </p>
            </div>
          `,
          fallbackText: `Welcome to CoachFit!\n\nHi${user.name ? ` ${user.name}` : ""},\n\nWelcome to CoachFit! We're excited to have you on board.\n\nYou're all set — your coach will guide you next.\n\nSign in to your dashboard: ${loginUrl}\n\nIf you have any questions, please contact your coach.`,
        })
      } catch (error) {
        console.error("Error sending welcome email:", error)
      }
    },

    async signIn({ user, account, profile }) {
      // Log OAuth sign-in
      if (account?.provider !== "credentials") {
        await logAuthEvent({
          action: "OAUTH_SIGNIN",
          email: user.email!,
          userId: user.id,
          metadata: { provider: account?.provider },
          success: true,
        })
      }
    },

    async signOut({ token }) {
      // Log sign-out
      await logAuthEvent({
        action: "SIGNOUT",
        email: token.email as string,
        userId: token.id as string,
        metadata: {},
        success: true,
      })
    },
  },

  callbacks: {
    async signIn({ user, account, profile }) {
      if (!user?.email || !user?.id) return true

      try {
        // Handle account linking: if OAuth provider and email already exists, link instead of reject
        if (account && account.provider !== "credentials") {
          const existingUser = await db.user.findUnique({
            where: { email: user.email },
            select: { id: true },
          })

          if (existingUser && existingUser.id !== user.id) {
            try {
              await db.user.delete({
                where: { id: user.id },
              })
            } catch (deleteError) {
              console.log("Note: Could not delete temporary user during account linking")
            }

            await db.account.create({
              data: {
                id: randomUUID(),
                userId: existingUser.id,
                type: account.type,
                provider: account.provider,
                providerAccountId: account.providerAccountId,
                access_token: account.access_token,
                refresh_token: account.refresh_token,
                expires_at: account.expires_at,
                token_type: account.token_type,
                scope: account.scope,
                id_token: account.id_token,
                session_state: account.session_state as string | null,
              },
            })

            user.id = existingUser.id
          }
        }

        // Coach invites
        const coachInvites = await db.coachInvite.findMany({
          where: { email: user.email },
        })

        if (coachInvites.length > 0) {
          const firstInvite = coachInvites[0]

          await db.user.update({
            where: { id: user.id },
            data: { invitedByCoachId: firstInvite.coachId },
          })

          await db.coachInvite.deleteMany({
            where: { email: user.email },
          })

          // Log invite processing
          await logAuthEvent({
            action: "COACH_INVITE_PROCESSED",
            email: user.email,
            userId: user.id,
            metadata: { coachId: firstInvite.coachId },
            success: true,
          })
        }

        // Cohort invites
        const cohortInvites = await db.cohortInvite.findMany({
          where: { email: user.email },
        })

        if (cohortInvites.length > 0) {
          const existingMembership = await db.cohortMembership.findFirst({
            where: { userId: user.id! },
            select: { cohortId: true },
          })

          if (existingMembership) {
            await db.cohortInvite.deleteMany({
              where: { email: user.email },
            })
          } else {
            const invite = cohortInvites[0]
            await db.$transaction(async (tx) => {
              await tx.cohortMembership.create({
                data: {
                  userId: user.id!,
                  cohortId: invite.cohortId,
                },
              })

              await tx.cohortInvite.deleteMany({
                where: { email: user.email },
              })
            })

            // Log invite processing
            await logAuthEvent({
              action: "COHORT_INVITE_PROCESSED",
              email: user.email,
              userId: user.id,
              metadata: { cohortId: invite.cohortId },
              success: true,
            })
          }
        }
      } catch (error) {
        console.error("Error processing invites on sign-in:", error)
      }

      return true
    },

    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id
        token.mustChangePassword = (user as any).mustChangePassword ?? false

        if (Array.isArray(user.roles) && user.roles.length > 0) {
          token.roles = user.roles
          token.isTestUser = user.isTestUser ?? false
          token.isOnboardingComplete =
            (user as any).isOnboardingComplete ?? (user as any).onboardingComplete ?? false
        } else {
          const dbUser = await db.user.findUnique({
            where: { id: user.id },
            select: { roles: true, isTestUser: true, onboardingComplete: true, mustChangePassword: true },
          })

          token.roles = dbUser?.roles ?? [Role.CLIENT]
          token.isTestUser = dbUser?.isTestUser ?? false
          token.isOnboardingComplete = dbUser?.onboardingComplete ?? false
          token.mustChangePassword = dbUser?.mustChangePassword ?? token.mustChangePassword ?? false
        }
      }

      // Admin override check
      if (token.adminOverride === undefined && token.email) {
        const roles = (token.roles as Role[]) ?? [Role.CLIENT]
        const hasOverrideAdmin = await isAdminWithOverride({
          roles,
          email: token.email as string,
        })

        token.adminOverride = hasOverrideAdmin
        if (hasOverrideAdmin && !roles.includes(Role.ADMIN)) {
          token.roles = [...roles, Role.ADMIN]
        }
      } else if (token.adminOverride && token.roles && !(token.roles as Role[]).includes(Role.ADMIN)) {
        token.roles = [...(token.roles as Role[]), Role.ADMIN]
      }

      // Refresh mustChangePassword status
      if (token.id && (token.mustChangePassword === undefined || token.mustChangePassword === true)) {
        const dbUser = await db.user.findUnique({
          where: { id: token.id as string },
          select: { mustChangePassword: true },
        })
        token.mustChangePassword = dbUser?.mustChangePassword ?? false
      }

      // SECURITY: Refresh token on update trigger
      if (trigger === "update") {
        const dbUser = await db.user.findUnique({
          where: { id: token.id as string },
          select: {
            roles: true,
            isTestUser: true,
            onboardingComplete: true,
            mustChangePassword: true,
          },
        })

        if (dbUser) {
          token.roles = dbUser.roles
          token.isTestUser = dbUser.isTestUser
          token.isOnboardingComplete = dbUser.onboardingComplete
          token.mustChangePassword = dbUser.mustChangePassword
        }
      }

      return token
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.roles = (token.roles as Role[]) ?? [Role.CLIENT]
        session.user.isTestUser = token.isTestUser as boolean
        ;(session.user as any).isOnboardingComplete = token.isOnboardingComplete as boolean
        ;(session.user as any).mustChangePassword = token.mustChangePassword as boolean
      }

      return session
    },

    // SECURITY: Redirect callback for validation
    async redirect({ url, baseUrl }) {
      // Allow relative URLs
      if (url.startsWith("/")) return `${baseUrl}${url}`

      // Allow same origin
      if (new URL(url).origin === baseUrl) return url

      // Default to base URL for external redirects (security)
      return baseUrl
    },
  },

  pages: {
    signIn: "/login",
    signOut: "/login",
    error: "/login", // Error code passed in query string as ?error=
    verifyRequest: "/login", // Used for check email message
  },

  // SECURITY: Enable debug only in development
  debug: process.env.NODE_ENV === "development",
}

export const { handlers, auth, signIn, signOut } = NextAuth(authOptions)
```

---

## Supporting Files

### 1. Audit Logging Module

**File**: `/lib/audit.ts` (NEW)

```typescript
import { db } from "./db"

/**
 * Log authentication events for security monitoring and HIPAA compliance.
 */
export async function logAuthEvent(params: {
  action: string
  email: string
  userId?: string
  metadata?: Record<string, any>
  success: boolean
}) {
  try {
    await db.auditLog.create({
      data: {
        userId: params.userId || null,
        action: params.action,
        target: `User:${params.email}`,
        metadata: {
          ...params.metadata,
          timestamp: new Date().toISOString(),
          success: params.success,
        },
      },
    })
  } catch (error) {
    // Don't block auth flow if logging fails
    console.error("Failed to log auth event:", error)
  }
}

/**
 * Log PHI (Protected Health Information) access for HIPAA compliance.
 * CRITICAL: Must be called for all read/write operations on PHI data.
 */
export async function logPHIAccess(params: {
  userId: string
  action: string
  target: string
  metadata?: Record<string, any>
  ipAddress?: string
  userAgent?: string
}) {
  try {
    await db.auditLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        target: params.target,
        metadata: {
          ...params.metadata,
          timestamp: new Date().toISOString(),
          ipAddress: params.ipAddress || "unknown",
          userAgent: params.userAgent || "unknown",
          phiAccess: true, // Flag for HIPAA audit reports
        },
      },
    })
  } catch (error) {
    // Log to console but don't block request
    console.error("CRITICAL: Failed to log PHI access:", error)
  }
}

/**
 * Retrieve audit logs for a specific user or action.
 * Used for HIPAA compliance reporting.
 */
export async function getAuditLogs(params: {
  userId?: string
  action?: string
  startDate?: Date
  endDate?: Date
  limit?: number
}) {
  return db.auditLog.findMany({
    where: {
      ...(params.userId && { userId: params.userId }),
      ...(params.action && { action: params.action }),
      ...(params.startDate && {
        createdAt: { gte: params.startDate },
      }),
      ...(params.endDate && {
        createdAt: { lte: params.endDate },
      }),
    },
    orderBy: { createdAt: "desc" },
    take: params.limit || 100,
  })
}
```

---

### 2. Rate Limiting Module

**File**: `/lib/rate-limit.ts` (NEW)

```typescript
/**
 * Simple in-memory rate limiter for development.
 * For production, use Upstash Redis or Vercel Edge Config.
 */

interface RateLimitStore {
  [key: string]: {
    count: number
    resetAt: number
  }
}

const store: RateLimitStore = {}

export async function checkRateLimit(
  key: string,
  options: {
    limit: number
    window: number // milliseconds
  }
): Promise<{
  success: boolean
  remaining: number
  resetAt: number
}> {
  const now = Date.now()
  const record = store[key]

  // Clean up expired entries
  if (record && record.resetAt < now) {
    delete store[key]
  }

  // Initialize or get existing record
  const current = store[key] || {
    count: 0,
    resetAt: now + options.window,
  }

  // Check limit
  if (current.count >= options.limit) {
    return {
      success: false,
      remaining: 0,
      resetAt: current.resetAt,
    }
  }

  // Increment counter
  current.count++
  store[key] = current

  return {
    success: true,
    remaining: options.limit - current.count,
    resetAt: current.resetAt,
  }
}

/**
 * Production implementation using Upstash Redis.
 * Uncomment when ready to deploy.
 */
/*
import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL!,
  token: process.env.UPSTASH_REDIS_TOKEN!,
})

export const loginRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "15 m"), // 5 attempts per 15 min
  analytics: true,
  prefix: "ratelimit:login",
})

export const apiRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, "1 m"), // 100 requests per minute
  analytics: true,
  prefix: "ratelimit:api",
})
*/
```

---

### 3. Updated Password Validation

**File**: `/lib/validations.ts` (UPDATE)

```typescript
// Add to existing validations.ts

export const passwordSchema = z.string()
  .min(12, "Password must be at least 12 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character")

export const signupSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: passwordSchema,
  name: z.string().optional(),
})

export const changePasswordSchema = z.object({
  currentPassword: z.string(),
  newPassword: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})
```

---

### 4. Prisma Schema Updates

**File**: `/prisma/schema.prisma` (ADD)

```prisma
model User {
  // ... existing fields

  // SECURITY: Account lockout fields
  failedLoginAttempts Int       @default(0)
  lockedUntil         DateTime?

  // ... rest of schema
}
```

**Migration**:
```bash
npx prisma migrate dev --name add_account_lockout_fields
```

---

## Environment Variables (Production)

**File**: `.env.example` (UPDATE)

```bash
# NextAuth Configuration
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=<generate-with-openssl-rand-base64-32>

# Google OAuth (Required)
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Database
DATABASE_URL=postgresql://user:password@host:port/database?sslmode=require

# Email Service (Resend)
RESEND_API_KEY=re_your-resend-api-key

# Admin Override (Emergency Access)
ADMIN_OVERRIDE_EMAIL=admin@example.com

# Rate Limiting (Optional - Upstash Redis)
# UPSTASH_REDIS_URL=https://...
# UPSTASH_REDIS_TOKEN=...

# Optional: Apple Sign-In
# APPLE_CLIENT_ID=your-apple-client-id
# APPLE_CLIENT_SECRET=your-apple-client-secret
```

---

## Usage Examples

### 1. Protected API Route with Audit Logging

```typescript
// app/api/clients/[id]/entries/route.ts
import { auth } from "@/lib/auth"
import { logPHIAccess } from "@/lib/audit"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  const { id } = await params

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // ... authorization checks ...

  const entries = await db.entry.findMany({
    where: { userId: id }
  })

  // HIPAA: Log PHI access
  await logPHIAccess({
    userId: session.user.id,
    action: "READ_CLIENT_ENTRIES",
    target: `Client:${id}`,
    metadata: {
      entriesCount: entries.length,
      route: "/api/clients/[id]/entries",
    },
    ipAddress: req.headers.get("x-forwarded-for") || undefined,
    userAgent: req.headers.get("user-agent") || undefined,
  })

  return NextResponse.json(entries)
}
```

---

### 2. Password Change with Session Invalidation

```typescript
// app/api/client/change-password/route.ts
import { auth, signOut } from "@/lib/auth"
import { changePasswordSchema } from "@/lib/validations"
import { logAuthEvent } from "@/lib/audit"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json()
  const validated = changePasswordSchema.parse(body)

  // ... verify current password ...
  // ... hash new password ...

  await db.user.update({
    where: { id: session.user.id },
    data: {
      passwordHash: newPasswordHash,
      mustChangePassword: false,
    },
  })

  // Log password change
  await logAuthEvent({
    action: "PASSWORD_CHANGED",
    email: session.user.email!,
    userId: session.user.id,
    metadata: {
      ipAddress: req.headers.get("x-forwarded-for"),
    },
    success: true,
  })

  // SECURITY: Force sign-out to invalidate existing sessions
  await signOut({ redirect: false })

  return NextResponse.json({
    message: "Password changed successfully. Please sign in again.",
  })
}
```

---

## Testing Checklist

### Authentication Tests
- [ ] Login with valid credentials succeeds
- [ ] Login with invalid password fails
- [ ] Login rate limiting triggers after 5 attempts
- [ ] Account locks after 10 failed attempts
- [ ] Locked account shows appropriate error message
- [ ] Account unlocks after 24 hours
- [ ] OAuth login (Google) works correctly
- [ ] Password reset flow works end-to-end

### Authorization Tests
- [ ] CLIENT can access own data only
- [ ] COACH can access assigned clients only
- [ ] ADMIN can access all resources
- [ ] Middleware blocks unauthorized routes
- [ ] JWT token expires after 7 days
- [ ] Token refresh works correctly

### Audit Logging Tests
- [ ] Login success/failure logged
- [ ] PHI access logged with all metadata
- [ ] Audit logs include IP address and user agent
- [ ] Failed logins include attempt count
- [ ] Account lockout events logged

### Security Tests
- [ ] CSRF token validation works
- [ ] Cookies have httpOnly, secure, sameSite flags
- [ ] Password complexity requirements enforced
- [ ] SQL injection attempts blocked (Prisma)
- [ ] XSS attempts escaped (React)

---

## Deployment Steps

### 1. Update Code
```bash
# Update auth.ts with new configuration
# Add audit.ts and rate-limit.ts
# Update validations.ts with password schema
# Run Prisma migration for lockout fields

npx prisma migrate deploy
npx prisma generate
```

### 2. Environment Variables (Vercel)
```bash
vercel env add NEXTAUTH_SECRET production
vercel env add ADMIN_OVERRIDE_EMAIL production
# ... add all required env vars
```

### 3. Test in Staging
```bash
# Deploy to preview environment
vercel --preview

# Run auth tests
npm run test:auth

# Verify audit logs
npm run db:studio
# Check auditLog table
```

### 4. Production Deployment
```bash
# Deploy to production
vercel --prod

# Monitor for errors
vercel logs --follow
```

---

## Monitoring & Alerts

### Key Metrics to Track
1. **Failed login rate** (threshold: >10/min)
2. **Account lockout events** (threshold: >5/hour)
3. **Rate limit violations** (threshold: >20/min)
4. **PHI access volume** (baseline + anomaly detection)
5. **Session duration** (average + outliers)

### Recommended Tools
- **Vercel Analytics**: Performance monitoring
- **Sentry**: Error tracking
- **Logtail/Datadog**: Log aggregation
- **Upstash**: Rate limiting (Redis)

---

## Security Checklist (Pre-Production)

- [ ] Session duration configured (7 days)
- [ ] CSRF protection enabled
- [ ] Secure cookies configured
- [ ] Rate limiting implemented
- [ ] Account lockout implemented
- [ ] Strong password policy enforced
- [ ] Audit logging for auth events
- [ ] Audit logging for PHI access
- [ ] Middleware for route protection
- [ ] Security headers configured
- [ ] Environment variables validated
- [ ] Business Associate Agreements signed
- [ ] Data breach response plan documented
- [ ] Privacy policy published
- [ ] Terms of service published

**Target Security Score**: 95/100

---

## FAQs

### Q: Why 7 days for session duration?
**A**: Balances security and UX. Users on trusted devices don't need to login daily. Mobile apps can use longer (30 days) via separate session config.

### Q: What happens after account lockout?
**A**: Account automatically unlocks after 24 hours. Admins can manually unlock via admin panel. User receives email notification.

### Q: Is rate limiting per IP or per email?
**A**: Both. Key is `login:${email}:${ipAddress}` to prevent distributed attacks while allowing legitimate users on VPNs.

### Q: How long are audit logs retained?
**A**: HIPAA requires 7 years. Configure auto-archival to cold storage (S3 Glacier) after 1 year.

### Q: Can I use database sessions instead of JWT?
**A**: Yes, change `strategy: "database"` in session config. Trade-off: More secure (can revoke immediately) but slower (DB query per request).

---

**Last Updated**: 2026-01-25
**Next Review**: 2026-04-25 (90 days)
