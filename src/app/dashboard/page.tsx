import { requireAuth } from "@/lib/auth"
import { AppLayout } from "@/components/layouts/AppLayout"
import { auth } from "@/auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CoachDashboard } from "@/components/coach/CoachDashboard"
import { prisma } from "@/lib/prisma"
import { startOfWeek, endOfWeek, startOfMonth } from "date-fns"
import { Users, Calendar, Dumbbell, DollarSign } from "lucide-react"
import { redirect } from "next/navigation"

async function getAdminDashboardStats() {
  const now = new Date()
  const weekStart = startOfWeek(now, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 })
  const monthStart = startOfMonth(now)

  const [totalMembers, appointmentsThisWeek, activeSessions, revenueResult] =
    await Promise.all([
      prisma.user.count({
        where: { role: "CLIENT" },
      }),
      prisma.appointment.count({
        where: {
          startTime: { gte: weekStart, lte: weekEnd },
        },
      }),
      prisma.classSession.count({
        where: {
          status: "SCHEDULED",
          startTime: { gte: weekStart, lte: weekEnd },
        },
      }),
      prisma.invoice.aggregate({
        where: {
          paymentStatus: "PAID",
          paidAt: { gte: monthStart },
        },
        _sum: { totalAmount: true },
      }),
    ])

  const revenue = Number(revenueResult._sum.totalAmount || 0)

  return { totalMembers, appointmentsThisWeek, activeSessions, revenue }
}

export default async function DashboardPage() {
  await requireAuth()
  const session = await auth()

  if (!session) return null

  // Redirect clients to their dashboard
  if (session.user.role === "CLIENT") {
    redirect("/client/dashboard")
  }

  const isCoach = session.user.role === "COACH"
  const isAdmin = session.user.role === "ADMIN"

  // Fetch real stats for admin
  const stats = isAdmin ? await getAdminDashboardStats() : null

  return (
    <AppLayout session={session}>
      {isCoach ? (
        <CoachDashboard />
      ) : (
        <div className="space-y-4">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome to your Centurion dashboard
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Members</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.totalMembers ?? 0}</div>
                <p className="text-xs text-muted-foreground">
                  Registered clients
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Appointments</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.appointmentsThisWeek ?? 0}</div>
                <p className="text-xs text-muted-foreground">
                  This week
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Sessions This Week</CardTitle>
                <Dumbbell className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.activeSessions ?? 0}</div>
                <p className="text-xs text-muted-foreground">
                  Scheduled
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${((stats?.revenue ?? 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <p className="text-xs text-muted-foreground">
                  This month
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Coach features for admin users */}
          {isAdmin && <CoachDashboard />}
        </div>
      )}
    </AppLayout>
  )
}
