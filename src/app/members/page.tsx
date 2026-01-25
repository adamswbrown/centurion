import { requireCoach } from "@/lib/auth"
import { auth } from "@/auth"
import { AppLayout } from "@/components/layouts/AppLayout"
import { MembersTable } from "@/features/members/MembersTable"
import { CreateMemberDialog } from "@/features/members/CreateMemberDialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getMembers } from "@/app/actions/members"

export default async function MembersPage() {
  await requireCoach()
  const session = await auth()

  if (!session) return null

  const members = await getMembers()

  return (
    <AppLayout session={session}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Members</h1>
            <p className="text-muted-foreground">
              Manage your members and their fitness journey
            </p>
          </div>
          <CreateMemberDialog />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Member List</CardTitle>
          </CardHeader>
          <CardContent>
            <MembersTable members={members} />
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
