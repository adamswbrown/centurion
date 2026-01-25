import { notFound } from "next/navigation"
import { requireCoach } from "@/lib/auth"
import { auth } from "@/auth"
import { AppLayout } from "@/components/layouts/AppLayout"
import { ClientDetail } from "@/components/clients/ClientDetail"
import { getClientById } from "@/app/actions/clients"

interface ClientPageProps {
  params: Promise<{ id: string }>
}

export default async function ClientPage({ params }: ClientPageProps) {
  await requireCoach()
  const session = await auth()

  if (!session) return null

  const { id } = await params
  const clientId = parseInt(id, 10)

  if (isNaN(clientId)) {
    notFound()
  }

  const client = await getClientById(clientId)

  if (!client) {
    notFound()
  }

  return (
    <AppLayout session={session}>
      <ClientDetail client={client} />
    </AppLayout>
  )
}
