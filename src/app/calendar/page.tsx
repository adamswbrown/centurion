import { AppLayout } from "@/components/layouts/AppLayout"
import { auth } from "@/auth"
import { requireCoach } from "@/lib/auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CombinedCalendar } from "@/features/calendar/CombinedCalendar"

export default async function CalendarPage() {
  await requireCoach()
  const session = await auth()

  if (!session) return null

  return (
    <AppLayout session={session}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Calendar</h1>
          <p className="text-muted-foreground">
            Combined view of appointments and sessions
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Combined Calendar</CardTitle>
          </CardHeader>
          <CardContent>
            <CombinedCalendar />
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
