import { AppLayout } from "@/components/layouts/AppLayout"
import { auth } from "@/auth"
import { requireAuth } from "@/lib/auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ClientAppointmentsCalendar } from "@/features/appointments/ClientAppointmentsCalendar"

export default async function MyAppointmentsPage() {
  await requireAuth()
  const session = await auth()

  if (!session) return null

  return (
    <AppLayout session={session}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">My Appointments</h1>
          <p className="text-muted-foreground">
            View your scheduled sessions in a calendar view
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Calendar</CardTitle>
          </CardHeader>
          <CardContent>
            <ClientAppointmentsCalendar />
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
