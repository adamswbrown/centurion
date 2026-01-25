import { requireCoach } from "@/lib/auth"
import { auth } from "@/auth"
import { AppLayout } from "@/components/layouts/AppLayout"
import { ClientsTable } from "@/components/clients/ClientsTable"
import { CreateClientDialog } from "@/components/clients/CreateClientDialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getClients } from "@/app/actions/clients"

export default async function ClientsPage() {
  await requireCoach()
  const session = await auth()

  if (!session) return null

  const clients = await getClients()

  return (
    <AppLayout session={session}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Clients</h1>
            <p className="text-muted-foreground">
              Manage your clients and their fitness journey
            </p>
          </div>
          <CreateClientDialog />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Client List</CardTitle>
          </CardHeader>
          <CardContent>
            <ClientsTable clients={clients} />
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
