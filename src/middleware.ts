import { auth } from "@/auth"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export default auth((req) => {
  const { nextUrl, auth } = req
  const isLoggedIn = !!auth?.user
  const userRole = auth?.user?.role

  // Public routes that don't require authentication
  const publicRoutes = ["/", "/login", "/register", "/api/auth"]
  const isPublicRoute = publicRoutes.some((route) =>
    nextUrl.pathname.startsWith(route)
  )

  // Admin-only routes
  const adminRoutes = ["/admin"]
  const isAdminRoute = adminRoutes.some((route) =>
    nextUrl.pathname.startsWith(route)
  )

  // Coach routes (accessible by ADMIN and COACH)
  const coachRoutes = ["/dashboard", "/members", "/appointments", "/bootcamps", "/invoices"]
  const isCoachRoute = coachRoutes.some((route) =>
    nextUrl.pathname.startsWith(route)
  )

  // Redirect logged-in users away from login/register
  if (isLoggedIn && (nextUrl.pathname === "/login" || nextUrl.pathname === "/register")) {
    return NextResponse.redirect(new URL("/dashboard", nextUrl))
  }

  // Require authentication for protected routes
  if (!isPublicRoute && !isLoggedIn) {
    const callbackUrl = encodeURIComponent(nextUrl.pathname + nextUrl.search)
    return NextResponse.redirect(new URL(`/login?callbackUrl=${callbackUrl}`, nextUrl))
  }

  // Admin-only access control
  if (isAdminRoute && userRole !== "ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", nextUrl))
  }

  // Coach access control (ADMIN and COACH only)
  if (isCoachRoute && userRole === "CLIENT") {
    return NextResponse.redirect(new URL("/client/dashboard", nextUrl))
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
