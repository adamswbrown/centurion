import { AppLayout } from "@/components/layouts/AppLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { auth } from "@/auth"
import { requireCoach } from "@/lib/auth"
import { getMembers } from "@/app/actions/members"
import { getAppointments } from "@/app/actions/appointments"
import { AppointmentList } from "@/features/appointments/AppointmentList"
import { AppointmentDashboard } from "@/features/appointments/AppointmentDashboard"

export default async function AppointmentsPage() {
  await requireCoach()
  const session = await auth()

  if (!session) return null

  const members = await getMembers()
  const appointments = await getAppointments()

  const appointmentRows = appointments.map((appointment) => ({
    ...appointment,
    fee: appointment.fee.toString(),
  }))

  return (
    <AppLayout session={session}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Appointments</h1>
          <p className="text-muted-foreground">
            Schedule and manage 1-on-1 sessions
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            <AppointmentDashboard members={members} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming Appointments</CardTitle>
          </CardHeader>
          <CardContent>
            <AppointmentList appointments={appointmentRows} />
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
