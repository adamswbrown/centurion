# RBAC Middleware Design
**Project**: Centurion Unified Fitness Platform
**Date**: 2026-01-25
**Purpose**: Automatic route protection with role-based access control

---

## Overview

This middleware design provides **automatic authentication and authorization** for all protected routes, eliminating the need for manual auth checks in every API route and page.

**Key Benefits**:
- ✅ Single source of truth for route protection
- ✅ Prevents forgotten auth checks
- ✅ Consistent error handling
- ✅ Performance optimized (lightweight JWT parsing)
- ✅ Easy to maintain and audit

---

## Architecture

### Middleware Flow

```
Incoming Request
      ↓
[1] Path Matching → Is this a protected route?
      ↓ Yes                    ↓ No
[2] Token Check            [Pass Through]
      ↓
[3] JWT Verification
      ↓
[4] Role Validation
      ↓
[5] Response (Allow/Deny)
```

### Route Protection Levels

| Level | Description | Routes | Roles Required |
|-------|-------------|--------|----------------|
| **Public** | No auth required | `/`, `/login`, `/signup` | None |
| **Authenticated** | Any logged-in user | `/dashboard` | Any role |
| **Client** | Client-only access | `/client-dashboard` | CLIENT |
| **Coach** | Coach or Admin | `/coach-dashboard` | COACH, ADMIN |
| **Admin** | Admin-only access | `/admin` | ADMIN |

---

## Implementation

### File: `middleware.ts`

```typescript
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

/**
 * Route protection configuration.
 * Maps route patterns to required roles.
 */
const routeProtection: Record<string, {
  roles?: string[]
  requireAuth: boolean
  description: string
}> = {
  // Public routes (no auth required)
  '/': { requireAuth: false, description: 'Landing page' },
  '/login': { requireAuth: false, description: 'Login page' },
  '/signup': { requireAuth: false, description: 'Signup page' },
  '/api/auth': { requireAuth: false, description: 'NextAuth endpoints' },

  // Admin routes
  '/admin': {
    requireAuth: true,
    roles: ['ADMIN'],
    description: 'Admin dashboard and management'
  },
  '/api/admin': {
    requireAuth: true,
    roles: ['ADMIN'],
    description: 'Admin API endpoints'
  },

  // Coach routes (COACH or ADMIN)
  '/coach-dashboard': {
    requireAuth: true,
    roles: ['COACH', 'ADMIN'],
    description: 'Coach dashboard'
  },
  '/api/coach-dashboard': {
    requireAuth: true,
    roles: ['COACH', 'ADMIN'],
    description: 'Coach dashboard API'
  },
  '/api/cohorts': {
    requireAuth: true,
    roles: ['COACH', 'ADMIN'],
    description: 'Cohort management'
  },
  '/api/invites': {
    requireAuth: true,
    roles: ['COACH', 'ADMIN'],
    description: 'Client invitations'
  },

  // Client routes (CLIENT, COACH, or ADMIN)
  '/client-dashboard': {
    requireAuth: true,
    roles: ['CLIENT'],
    description: 'Client dashboard'
  },
  '/api/client': {
    requireAuth: true,
    roles: ['CLIENT', 'COACH', 'ADMIN'],
    description: 'Client data endpoints'
  },
  '/api/entries': {
    requireAuth: true,
    roles: ['CLIENT', 'COACH', 'ADMIN'],
    description: 'Entry logging'
  },

  // Coach viewing client data
  '/api/clients': {
    requireAuth: true,
    roles: ['COACH', 'ADMIN'],
    description: 'Client management (coach perspective)'
  },

  // Generic authenticated routes
  '/dashboard': {
    requireAuth: true,
    description: 'Dashboard redirect'
  },
  '/onboarding': {
    requireAuth: true,
    description: 'Onboarding flow'
  },
  '/api/onboarding': {
    requireAuth: true,
    description: 'Onboarding API'
  },
  '/api/user': {
    requireAuth: true,
    description: 'User profile and settings'
  },
}

/**
 * Find the protection config for a given pathname.
 * Returns the most specific match (longest matching prefix).
 */
function findRouteProtection(pathname: string) {
  // Exact match first
  if (routeProtection[pathname]) {
    return routeProtection[pathname]
  }

  // Find longest matching prefix
  let longestMatch = ''
  let matchedConfig = null

  for (const [route, config] of Object.entries(routeProtection)) {
    if (pathname.startsWith(route) && route.length > longestMatch.length) {
      longestMatch = route
      matchedConfig = config
    }
  }

  return matchedConfig
}

/**
 * Main middleware function.
 * Runs on every request to protected routes.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Find protection config for this route
  const protection = findRouteProtection(pathname)

  // No protection config = allow (default open for unlisted routes)
  // For production, consider changing to default deny
  if (!protection) {
    return NextResponse.next()
  }

  // Public route = allow
  if (!protection.requireAuth) {
    return NextResponse.next()
  }

  // Protected route = check authentication
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  })

  // No token = unauthorized
  if (!token) {
    if (pathname.startsWith('/api')) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      )
    }

    // Redirect to login for page routes
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Check role-based authorization (if roles specified)
  if (protection.roles && protection.roles.length > 0) {
    const userRoles = (token.roles as string[]) || []
    const hasRequiredRole = protection.roles.some(role =>
      userRoles.includes(role)
    )

    if (!hasRequiredRole) {
      if (pathname.startsWith('/api')) {
        return NextResponse.json(
          {
            error: 'Forbidden',
            message: `Access denied. Required roles: ${protection.roles.join(', ')}`,
          },
          { status: 403 }
        )
      }

      // Redirect to appropriate dashboard for page routes
      const dashboardUrl = getDashboardForRole(userRoles[0])
      return NextResponse.redirect(new URL(dashboardUrl, request.url))
    }
  }

  // Check for forced password change
  if (token.mustChangePassword && !pathname.startsWith('/api/client/change-password')) {
    if (pathname.startsWith('/api')) {
      return NextResponse.json(
        {
          error: 'Password Change Required',
          message: 'You must change your password before continuing',
          requirePasswordChange: true,
        },
        { status: 403 }
      )
    }

    return NextResponse.redirect(new URL('/client-dashboard/settings?mustChangePassword=true', request.url))
  }

  // All checks passed = allow
  return NextResponse.next()
}

/**
 * Helper: Get dashboard URL based on user's primary role.
 */
function getDashboardForRole(role: string): string {
  switch (role) {
    case 'ADMIN':
      return '/admin'
    case 'COACH':
      return '/coach-dashboard'
    case 'CLIENT':
      return '/client-dashboard'
    default:
      return '/dashboard'
  }
}

/**
 * Middleware configuration.
 * Specifies which routes to run middleware on.
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png|.*\\.jpg|.*\\.jpeg|.*\\.svg).*)',
  ],
}
```

---

## Advanced Features

### 1. IP Allowlist for Admin Routes

```typescript
// Add to middleware.ts

const ADMIN_IP_ALLOWLIST = process.env.ADMIN_IP_ALLOWLIST?.split(',') || []

// In middleware function, before role check:
if (pathname.startsWith('/admin') && ADMIN_IP_ALLOWLIST.length > 0) {
  const clientIP = request.headers.get('x-forwarded-for') || request.ip

  if (!ADMIN_IP_ALLOWLIST.includes(clientIP)) {
    return NextResponse.json(
      { error: 'Forbidden', message: 'Access denied from this IP address' },
      { status: 403 }
    )
  }
}
```

---

### 2. Time-Based Access Control

```typescript
// Add to routeProtection config

'/api/admin/reports': {
  requireAuth: true,
  roles: ['ADMIN'],
  allowedHours: { start: 9, end: 17 }, // 9 AM - 5 PM
  allowedDays: [1, 2, 3, 4, 5], // Monday-Friday
  description: 'Admin reports (business hours only)'
}

// In middleware function:
if (protection.allowedHours) {
  const hour = new Date().getHours()
  if (hour < protection.allowedHours.start || hour >= protection.allowedHours.end) {
    return NextResponse.json(
      { error: 'Forbidden', message: 'Access only allowed during business hours' },
      { status: 403 }
    )
  }
}
```

---

### 3. Request Logging

```typescript
// Add to middleware.ts

import { logRequest } from './lib/audit'

// After successful authorization:
if (pathname.startsWith('/api')) {
  // Log API requests for security monitoring
  await logRequest({
    userId: token.id as string,
    path: pathname,
    method: request.method,
    userAgent: request.headers.get('user-agent') || undefined,
    ipAddress: request.headers.get('x-forwarded-for') || undefined,
  })
}
```

---

### 4. Feature Flags

```typescript
// Add to middleware.ts

const FEATURE_FLAGS = {
  cohortManagement: process.env.FEATURE_COHORT_MANAGEMENT === 'true',
  healthKitIntegration: process.env.FEATURE_HEALTHKIT === 'true',
  adminDashboard: process.env.FEATURE_ADMIN_DASHBOARD === 'true',
}

// In middleware function:
if (pathname.startsWith('/api/cohorts') && !FEATURE_FLAGS.cohortManagement) {
  return NextResponse.json(
    { error: 'Feature Disabled', message: 'Cohort management is currently disabled' },
    { status: 503 }
  )
}
```

---

## Testing Strategy

### Unit Tests

**File**: `middleware.test.ts`

```typescript
import { describe, it, expect, vi } from 'vitest'
import { middleware } from './middleware'
import { NextRequest } from 'next/server'

describe('Middleware', () => {
  it('allows public routes without token', async () => {
    const req = new NextRequest('http://localhost:3000/login')
    const res = await middleware(req)
    expect(res.status).toBe(200)
  })

  it('blocks protected routes without token', async () => {
    const req = new NextRequest('http://localhost:3000/admin')
    const res = await middleware(req)
    expect(res.status).toBe(302) // Redirect to login
  })

  it('blocks admin routes for non-admin users', async () => {
    const req = new NextRequest('http://localhost:3000/api/admin/users')
    // Mock token with CLIENT role
    vi.mock('next-auth/jwt', () => ({
      getToken: () => Promise.resolve({ roles: ['CLIENT'] })
    }))

    const res = await middleware(req)
    expect(res.status).toBe(403)
  })

  it('allows coach routes for coaches and admins', async () => {
    const req = new NextRequest('http://localhost:3000/coach-dashboard')
    vi.mock('next-auth/jwt', () => ({
      getToken: () => Promise.resolve({ roles: ['COACH'] })
    }))

    const res = await middleware(req)
    expect(res.status).toBe(200)
  })
})
```

---

### Integration Tests

**File**: `middleware.integration.test.ts`

```typescript
import { test, expect } from '@playwright/test'

test.describe('Middleware Integration', () => {
  test('redirects to login when accessing protected route', async ({ page }) => {
    await page.goto('/admin')
    await expect(page).toHaveURL(/\/login/)
  })

  test('allows admin access after login', async ({ page, context }) => {
    // Login as admin
    await page.goto('/login')
    await page.fill('input[name="email"]', 'admin@test.local')
    await page.fill('input[name="password"]', 'admin123')
    await page.click('button[type="submit"]')

    // Navigate to admin page
    await page.goto('/admin')
    await expect(page).toHaveURL(/\/admin/)
  })

  test('blocks client from accessing coach dashboard', async ({ page }) => {
    // Login as client
    await page.goto('/login')
    await page.fill('input[name="email"]', 'client@test.local')
    await page.fill('input[name="password"]', 'client123')
    await page.click('button[type="submit"]')

    // Try to access coach dashboard
    await page.goto('/coach-dashboard')
    await expect(page).toHaveURL(/\/client-dashboard/)
  })
})
```

---

## Performance Considerations

### 1. Caching Token Verification

```typescript
// Use LRU cache to avoid repeated JWT verifications
import LRU from 'lru-cache'

const tokenCache = new LRU<string, any>({
  max: 500,
  ttl: 60 * 1000, // 1 minute
})

export async function middleware(request: NextRequest) {
  const tokenString = request.cookies.get('next-auth.session-token')?.value

  if (!tokenString) {
    // ... handle missing token
  }

  // Check cache first
  let token = tokenCache.get(tokenString)

  if (!token) {
    token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
    if (token) {
      tokenCache.set(tokenString, token)
    }
  }

  // ... rest of middleware
}
```

---

### 2. Edge Runtime Optimization

```typescript
// Add to middleware.ts

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png|.*\\.jpg|.*\\.jpeg|.*\\.svg).*)',
  ],
  runtime: 'experimental-edge', // Run on Vercel Edge Network for lower latency
}
```

---

### 3. Skip Middleware for Static Assets

```typescript
// Optimize matcher to exclude all static files
export const config = {
  matcher: [
    '/api/:path*',
    '/admin/:path*',
    '/coach-dashboard/:path*',
    '/client-dashboard/:path*',
    '/dashboard',
    '/onboarding/:path*',
  ],
}
```

---

## Security Considerations

### 1. CSRF Protection

```typescript
// Add CSRF token validation for state-changing requests
if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
  const csrfToken = request.headers.get('x-csrf-token')
  const expectedToken = token.csrfToken

  if (csrfToken !== expectedToken) {
    return NextResponse.json(
      { error: 'Invalid CSRF token' },
      { status: 403 }
    )
  }
}
```

---

### 2. Rate Limiting Integration

```typescript
import { checkRateLimit } from './lib/rate-limit'

// Add before role check
const rateLimitKey = `api:${token.id}:${pathname}`
const rateLimitResult = await checkRateLimit(rateLimitKey, {
  limit: 100,
  window: 60 * 1000, // 100 requests per minute
})

if (!rateLimitResult.success) {
  return NextResponse.json(
    {
      error: 'Too Many Requests',
      message: 'Rate limit exceeded',
      retryAfter: Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000),
    },
    { status: 429 }
  )
}
```

---

### 3. Audit Logging

```typescript
import { logMiddlewareEvent } from './lib/audit'

// Log authorization failures
if (!hasRequiredRole) {
  await logMiddlewareEvent({
    userId: token.id as string,
    action: 'AUTHORIZATION_FAILED',
    path: pathname,
    requiredRoles: protection.roles,
    userRoles,
    ipAddress: request.headers.get('x-forwarded-for') || undefined,
  })
}
```

---

## Migration Guide

### Step 1: Remove Manual Auth Checks

**Before** (app/api/admin/users/route.ts):
```typescript
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (!isAdmin(session.user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  // ... route logic
}
```

**After** (with middleware):
```typescript
export async function GET(req: NextRequest) {
  // Middleware already verified auth + admin role
  const session = await auth()

  // ... route logic
}
```

---

### Step 2: Deploy Incrementally

1. **Phase 1**: Deploy middleware alongside existing auth checks (redundant but safe)
2. **Phase 2**: Monitor logs to ensure middleware works correctly
3. **Phase 3**: Remove manual auth checks from routes one by one
4. **Phase 4**: Verify all routes still work correctly

---

### Step 3: Update Tests

Update API route tests to mock middleware instead of auth checks:

```typescript
// Before
vi.mock('@/lib/auth', () => ({
  auth: () => Promise.resolve({ user: { id: '1', roles: ['ADMIN'] } })
}))

// After (middleware handles auth)
// No mocking needed if testing route logic only
// Or mock middleware if testing auth flow
```

---

## Monitoring & Debugging

### 1. Enable Debug Logging (Development)

```typescript
// Add to middleware.ts

const DEBUG = process.env.NODE_ENV === 'development'

if (DEBUG) {
  console.log('[Middleware]', {
    path: pathname,
    method: request.method,
    protection,
    userRoles: (token?.roles as string[]) || [],
    decision: hasRequiredRole ? 'ALLOW' : 'DENY',
  })
}
```

---

### 2. Middleware Metrics (Production)

```typescript
// Track middleware performance
import { trackMetric } from './lib/metrics'

const startTime = Date.now()

// ... middleware logic ...

trackMetric('middleware.duration', Date.now() - startTime, {
  path: pathname,
  decision: hasRequiredRole ? 'allow' : 'deny',
})
```

---

## FAQs

### Q: Does middleware run on every request?
**A**: Yes, but only for paths matching the `config.matcher`. Static files are excluded.

### Q: What's the performance impact?
**A**: ~5-10ms per request for JWT verification. Use edge runtime and caching to minimize.

### Q: Can I bypass middleware for testing?
**A**: Yes, set `BYPASS_MIDDLEWARE=true` in `.env.test` and add:
```typescript
if (process.env.BYPASS_MIDDLEWARE === 'true') {
  return NextResponse.next()
}
```

### Q: How do I handle API routes with dynamic role requirements?
**A**: Middleware handles coarse-grained auth (COACH role required). Route handles fine-grained auth (owns this specific cohort).

### Q: What happens if NEXTAUTH_SECRET is missing?
**A**: Middleware throws error. Add validation at startup:
```typescript
if (!process.env.NEXTAUTH_SECRET) {
  throw new Error('NEXTAUTH_SECRET is required')
}
```

---

## Route Protection Matrix

| Route | Public | CLIENT | COACH | ADMIN | Notes |
|-------|--------|--------|-------|-------|-------|
| `/` | ✅ | ✅ | ✅ | ✅ | Landing page |
| `/login` | ✅ | ❌ | ❌ | ❌ | Redirect if logged in |
| `/signup` | ✅ | ❌ | ❌ | ❌ | Redirect if logged in |
| `/dashboard` | ❌ | ✅ | ✅ | ✅ | Role-based redirect |
| `/client-dashboard` | ❌ | ✅ | ❌ | ❌ | Client only |
| `/coach-dashboard` | ❌ | ❌ | ✅ | ✅ | Coach or Admin |
| `/admin` | ❌ | ❌ | ❌ | ✅ | Admin only |
| `/api/client/*` | ❌ | ✅ | ✅ | ✅ | Own data or coaching |
| `/api/clients/*` | ❌ | ❌ | ✅ | ✅ | Coach managing clients |
| `/api/cohorts/*` | ❌ | ❌ | ✅ | ✅ | Cohort management |
| `/api/admin/*` | ❌ | ❌ | ❌ | ✅ | Admin operations |

---

## Summary

This middleware design provides:
- ✅ **Automatic protection** for all routes
- ✅ **Centralized configuration** (single source of truth)
- ✅ **Performance optimized** (edge runtime, caching)
- ✅ **Extensible** (IP allowlist, time-based, feature flags)
- ✅ **Auditable** (logging integration)
- ✅ **Testable** (unit + integration tests)

**Implementation Time**: 4 hours
**Maintenance**: Low (change route protection config as needed)

**Next Steps**:
1. Review route protection matrix
2. Implement middleware.ts
3. Test with existing routes
4. Deploy incrementally
5. Remove manual auth checks

---

**Last Updated**: 2026-01-25
**Next Review**: When adding new route patterns
