import { AppLayout } from "@/components/layouts/AppLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { auth } from "@/auth"
import { requireCoach } from "@/lib/auth"
import { getBootcamps } from "@/app/actions/bootcamps"
import { BootcampForm } from "@/features/bootcamps/BootcampForm"
import { BootcampList } from "@/features/bootcamps/BootcampList"
import { BootcampCalendar } from "@/features/bootcamps/BootcampCalendar"

export default async function BootcampsPage() {
  await requireCoach()
  const session = await auth()

  if (!session) return null

  const bootcamps = await getBootcamps()

  return (
    <AppLayout session={session}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Bootcamps</h1>
          <p className="text-muted-foreground">
            Schedule group classes and manage attendees
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Create Bootcamp</CardTitle>
          </CardHeader>
          <CardContent>
            <BootcampForm />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Calendar</CardTitle>
          </CardHeader>
          <CardContent>
            <BootcampCalendar />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming Bootcamps</CardTitle>
          </CardHeader>
          <CardContent>
            <BootcampList bootcamps={bootcamps} />
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
