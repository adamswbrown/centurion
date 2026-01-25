# Security Quick Reference Card
**Project**: Centurion Unified Fitness Platform
**Security Score**: 87/100 → 95/100 (after Phase 1)

---

## TL;DR

**Status**: Production-ready after implementing 6 critical actions (12 hours + 1 week vendor time)

**Critical Blockers**:
1. ❌ No audit logging for PHI access (HIPAA requirement)
2. ❌ No Business Associate Agreements signed (HIPAA requirement)
3. ❌ No rate limiting on auth endpoints (brute force risk)

**Quick Win**: Fix #1-3 to achieve HIPAA compliance and 95/100 security score.

---

## Phase 1 Action Plan (Before Launch)

| # | Task | File | Time | Priority |
|---|------|------|------|----------|
| 1 | Implement audit logging | `/lib/audit.ts` + all PHI routes | 2h | P1 🔴 |
| 2 | Add rate limiting | `/lib/rate-limit.ts` + `/lib/auth.ts` | 3h | P1 🔴 |
| 3 | Create middleware | `/middleware.ts` | 2h | P1 🔴 |
| 4 | Strengthen password policy | `/lib/validations.ts` | 30m | P2 🟡 |
| 5 | Increase session duration | `/lib/auth.ts` (1hr → 7 days) | 5m | P2 🟡 |
| 6 | Add security headers | `next.config.js` | 1h | P2 🟡 |
| 7 | Sign BAAs | Contact vendors | 1 week | P1 🔴 |
| 8 | Create incident plan | `/docs/INCIDENT_RESPONSE_PLAN.md` | 2h | P1 🔴 |
| 9 | Publish Privacy Policy | Website footer + signup flow | 1h | P1 🔴 |

**Total Developer Time**: 12 hours
**External Dependencies**: 1 week (vendor BAA responses)

---

## Current Security Posture

### Strengths ✅
- Auth.js v5 with JWT sessions
- bcrypt password hashing (10 rounds)
- Google/Apple OAuth + Email/Password
- RBAC (CLIENT, COACH, ADMIN)
- Zod input validation
- Prisma ORM (SQL injection protection)
- HTTPS enforced (Vercel SSL)
- PostgreSQL encryption at rest

### Critical Gaps ❌
- No audit logging for PHI access
- No rate limiting (brute force vulnerable)
- No middleware (manual auth checks)
- Weak password policy (8 chars, no complexity)
- Short session (1 hour, poor UX)
- No Business Associate Agreements
- No incident response plan

---

## PHI Data Inventory

**Protected Health Information** (must log all access):

| Model | Fields | Sensitivity |
|-------|--------|-------------|
| `Entry` | weight, sleepQuality, perceivedStress, notes | HIGH |
| `HealthKitWorkout` | heartRate, calories, distance | HIGH |
| `SleepRecord` | totalSleep, deepSleep, remSleep | HIGH |
| `CoachNote` | notes | HIGH |
| `User` | name, email, birthDate | MEDIUM |

---

## Quick Implementation Snippets

### 1. Audit Logging (2 hours)

**Create** `/lib/audit.ts`:
```typescript
import { db } from "./db"

export async function logPHIAccess(params: {
  userId: string
  action: string
  target: string
  metadata?: any
  ipAddress?: string
  userAgent?: string
}) {
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
        phiAccess: true,
      },
    },
  })
}
```

**Use in API routes**:
```typescript
// After fetching PHI data
await logPHIAccess({
  userId: session.user.id,
  action: "READ_CLIENT_ENTRIES",
  target: `Client:${clientId}`,
  ipAddress: req.headers.get("x-forwarded-for") || undefined,
  userAgent: req.headers.get("user-agent") || undefined,
})
```

**Routes requiring audit logs**:
- `/api/clients/[id]/entries` (READ_CLIENT_ENTRIES)
- `/api/clients/[id]/analytics` (READ_CLIENT_ANALYTICS)
- `/api/clients/[id]/weekly-summary` (READ_WEEKLY_SUMMARY)
- `/api/healthkit/workouts` (READ_HEALTHKIT_DATA)
- `/api/healthkit/sleep` (READ_SLEEP_DATA)
- `/api/entries` (CREATE_ENTRY, UPDATE_ENTRY)

---

### 2. Rate Limiting (3 hours)

**Create** `/lib/rate-limit.ts`:
```typescript
interface RateLimitStore {
  [key: string]: { count: number; resetAt: number }
}

const store: RateLimitStore = {}

export async function checkRateLimit(
  key: string,
  options: { limit: number; window: number }
): Promise<{ success: boolean; remaining: number; resetAt: number }> {
  const now = Date.now()
  const record = store[key]

  if (record && record.resetAt < now) {
    delete store[key]
  }

  const current = store[key] || {
    count: 0,
    resetAt: now + options.window,
  }

  if (current.count >= options.limit) {
    return { success: false, remaining: 0, resetAt: current.resetAt }
  }

  current.count++
  store[key] = current

  return {
    success: true,
    remaining: options.limit - current.count,
    resetAt: current.resetAt,
  }
}
```

**Add to** `/lib/auth.ts` (in CredentialsProvider authorize):
```typescript
// Before password verification
const ipAddress = req?.headers?.["x-forwarded-for"] || "unknown"
const rateLimitKey = `login:${email}:${ipAddress}`

const rateLimitResult = await checkRateLimit(rateLimitKey, {
  limit: 5,
  window: 15 * 60 * 1000, // 5 attempts per 15 minutes
})

if (!rateLimitResult.success) {
  return null // Login denied
}
```

---

### 3. Middleware (2 hours)

**Create** `/middleware.ts`:
```typescript
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

const routeProtection: Record<string, { roles?: string[]; requireAuth: boolean }> = {
  '/admin': { requireAuth: true, roles: ['ADMIN'] },
  '/api/admin': { requireAuth: true, roles: ['ADMIN'] },
  '/coach-dashboard': { requireAuth: true, roles: ['COACH', 'ADMIN'] },
  '/api/cohorts': { requireAuth: true, roles: ['COACH', 'ADMIN'] },
  '/client-dashboard': { requireAuth: true, roles: ['CLIENT'] },
  '/api/entries': { requireAuth: true },
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const protection = Object.entries(routeProtection).find(([route]) =>
    pathname.startsWith(route)
  )?.[1]

  if (!protection || !protection.requireAuth) {
    return NextResponse.next()
  }

  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })

  if (!token) {
    return pathname.startsWith('/api')
      ? NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      : NextResponse.redirect(new URL('/login', request.url))
  }

  if (protection.roles) {
    const userRoles = (token.roles as string[]) || []
    const hasRole = protection.roles.some(r => userRoles.includes(r))

    if (!hasRole) {
      return pathname.startsWith('/api')
        ? NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        : NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png|.*\\.svg).*)'],
}
```

---

### 4. Strong Password Policy (30 min)

**Update** `/lib/validations.ts`:
```typescript
export const passwordSchema = z.string()
  .min(12, "Password must be at least 12 characters")
  .regex(/[A-Z]/, "Must contain uppercase letter")
  .regex(/[a-z]/, "Must contain lowercase letter")
  .regex(/[0-9]/, "Must contain number")
  .regex(/[^A-Za-z0-9]/, "Must contain special character")

export const signupSchema = z.object({
  email: z.string().email(),
  password: passwordSchema,
  name: z.string().optional(),
})
```

---

### 5. Extended Session Duration (5 min)

**Update** `/lib/auth.ts`:
```typescript
session: {
  strategy: "jwt",
  maxAge: 7 * 24 * 60 * 60, // 7 days (was 1 hour)
  updateAge: 24 * 60 * 60,  // Refresh every 24 hours
}
```

---

### 6. Security Headers (1 hour)

**Create/Update** `next.config.js`:
```javascript
const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Content-Security-Policy',
    value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';"
  },
]

module.exports = {
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }]
  }
}
```

---

## BAA Vendors (Must Sign Before Launch)

1. **Vercel** (hosting)
   - Contact: https://vercel.com/support
   - Request: "HIPAA Business Associate Agreement"
   - Plan: May require Pro plan ($20/month)

2. **Railway** (database)
   - Contact: https://railway.app/help
   - Request: "HIPAA Business Associate Agreement"
   - Plan: May require Pro plan ($20/month)

3. **Resend** (email)
   - Contact: https://resend.com/support
   - Request: "HIPAA Business Associate Agreement"
   - Plan: Check if BAA available on free tier

4. **Google** (OAuth)
   - Contact: Google Cloud Support
   - Request: "Business Associate Agreement for Google Sign-In"
   - Plan: Typically requires Google Workspace Enterprise

---

## Testing Checklist

**Pre-Deployment**:
- [ ] Login succeeds with valid credentials
- [ ] Login fails with invalid password
- [ ] Rate limit triggers after 5 failed attempts
- [ ] Middleware blocks unauthorized routes
- [ ] PHI access creates audit log entry
- [ ] Password policy enforces complexity
- [ ] JWT token expires after 7 days
- [ ] Security headers present in response
- [ ] `npm run build` succeeds
- [ ] `npm audit` shows no critical vulnerabilities

**Post-Deployment**:
- [ ] All critical user flows work in production
- [ ] Audit logs appear in database
- [ ] Rate limiting works across multiple IPs
- [ ] No errors in Vercel logs (first 24 hours)
- [ ] BAAs signed with all vendors

---

## Environment Variables

**Required**:
```bash
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=<openssl rand -base64 32>
DATABASE_URL=postgresql://...?sslmode=require
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
RESEND_API_KEY=...
```

**Optional**:
```bash
ADMIN_OVERRIDE_EMAIL=admin@example.com
UPSTASH_REDIS_URL=https://... (for production rate limiting)
UPSTASH_REDIS_TOKEN=...
```

---

## Deployment Commands

```bash
# 1. Update dependencies
npm install

# 2. Run Prisma migration (add lockout fields)
npx prisma migrate dev --name add_account_lockout_fields
npx prisma generate

# 3. Build and test locally
npm run build
npm run start

# 4. Deploy to Vercel preview
vercel --preview

# 5. Test in preview environment
# ... manual testing ...

# 6. Deploy to production
vercel --prod

# 7. Monitor logs
vercel logs --follow
```

---

## Monitoring Dashboard (Post-Launch)

**Daily** (5 min):
- Check Vercel logs for 500 errors
- Review failed login count
- Verify database backups completed

**Weekly** (30 min):
- Review audit logs for anomalies
- Check rate limit violations
- Scan for unusual PHI access patterns
- Run `npm audit`

**Monthly** (2 hours):
- Security assessment
- Review user reports
- Update dependencies
- Test disaster recovery

---

## HIPAA Compliance Score

**Current**: 72/100
**After Phase 1**: 93/100 ✅

**Remaining Gaps** (post-launch):
- Data export feature (users can download their data)
- Access history dashboard (users see who viewed their data)
- Disaster recovery testing

---

## Emergency Contacts

**Security Incident**: [Security Official Email]
**Technical Issues**: [Developer Email]
**Legal/HIPAA**: [Legal Counsel Email]
**Vendor Support**:
- Vercel: https://vercel.com/support
- Railway: https://railway.app/help
- Resend: https://resend.com/support

---

## Useful Commands

```bash
# Generate NEXTAUTH_SECRET
openssl rand -base64 32

# Check vulnerabilities
npm audit

# View audit logs
npx prisma studio
# Navigate to AuditLog table

# Test rate limiting
for i in {1..10}; do curl -X POST http://localhost:3000/api/auth/signin; done

# Export database
pg_dump $DATABASE_URL > backup.sql

# Restore database
psql $DATABASE_URL < backup.sql
```

---

## Reference Documents

**Full Details**:
- `/docs/SECURITY_BASELINE_REPORT.md` - 100-point security assessment
- `/docs/RECOMMENDED_AUTH_CONFIG.md` - Production Auth.js setup
- `/docs/RBAC_MIDDLEWARE_DESIGN.md` - Middleware implementation
- `/docs/HIPAA_COMPLIANCE_CHECKLIST.md` - HIPAA requirements
- `/docs/SECURITY_REVIEW_SUMMARY.md` - Complete security review

**Quick Access**:
- This document: `/docs/SECURITY_QUICK_REFERENCE.md`

---

## Decision Tree: Ready to Launch?

```
Do you handle PHI (health data)?
  ├─ No → Launch anytime (low risk)
  └─ Yes → Are you HIPAA compliant?
      ├─ No → BLOCK: Implement Phase 1 (12 hours + 1 week)
      └─ Yes → Have you signed BAAs with all vendors?
          ├─ No → BLOCK: Contact vendors (1 week)
          └─ Yes → Have you implemented audit logging?
              ├─ No → BLOCK: Critical HIPAA requirement (2 hours)
              └─ Yes → ✅ READY TO LAUNCH
```

---

**Last Updated**: 2026-01-25
**Security Score**: 87/100 → 95/100 (after Phase 1)
**HIPAA Compliance**: 72/100 → 93/100 (after Phase 1)

**Status**: 🟡 **Not Ready** (implement Phase 1 first) → ✅ **Production Ready** (after Phase 1)
