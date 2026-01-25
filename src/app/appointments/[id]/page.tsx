import { notFound } from "next/navigation"
import { AppLayout } from "@/components/layouts/AppLayout"
import { auth } from "@/auth"
import { requireCoach } from "@/lib/auth"
import { getAppointmentById } from "@/app/actions/appointments"
import { AppointmentDetail } from "@/features/appointments/AppointmentDetail"

interface AppointmentPageProps {
  params: Promise<{ id: string }>
}

export default async function AppointmentPage({ params }: AppointmentPageProps) {
  await requireCoach()
  const session = await auth()

  if (!session) return null

  const { id } = await params
  const appointmentId = Number.parseInt(id, 10)

  if (Number.isNaN(appointmentId)) {
    notFound()
  }

  const appointment = await getAppointmentById(appointmentId)

  if (!appointment) {
    notFound()
  }

  return (
    <AppLayout session={session}>
      <AppointmentDetail appointment={appointment} />
    </AppLayout>
  )
}
