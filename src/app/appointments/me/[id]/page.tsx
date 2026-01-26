import { notFound } from "next/navigation"
import { AppLayout } from "@/components/layouts/AppLayout"
import { auth } from "@/auth"
import { requireAuth } from "@/lib/auth"
import { getMyAppointmentById } from "@/app/actions/client-appointments"
import { ClientAppointmentDetail } from "@/features/appointments/ClientAppointmentDetail"

interface ClientAppointmentPageProps {
  params: Promise<{ id: string }>
}

export default async function ClientAppointmentPage({
  params,
}: ClientAppointmentPageProps) {
  await requireAuth()
  const session = await auth()

  if (!session) return null

  const { id } = await params
  const appointmentId = Number.parseInt(id, 10)

  if (Number.isNaN(appointmentId)) {
    notFound()
  }

  try {
    const appointment = await getMyAppointmentById(appointmentId)

    if (!appointment) {
      notFound()
    }

    return (
      <AppLayout session={session}>
        <ClientAppointmentDetail appointment={appointment} />
      </AppLayout>
    )
  } catch {
    notFound()
  }
}
