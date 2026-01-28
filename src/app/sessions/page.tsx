import { AppLayout } from "@/components/layouts/AppLayout"
import { auth } from "@/auth"
import { requireCoach } from "@/lib/auth"
import { SessionList } from "@/features/sessions/SessionList"
import { ClassTypeManager } from "@/features/sessions/ClassTypeManager"
import { SessionCalendar } from "@/features/sessions/SessionCalendar"
import { SessionForm } from "@/features/sessions/SessionForm"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

export default async function SessionsPage() {
  await requireCoach()
  const session = await auth()

  if (!session) return null

  return (
    <AppLayout session={session}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Sessions</h1>
            <p className="text-muted-foreground">
              Manage group sessions, class types, and schedules
            </p>
          </div>

          <Dialog>
            <DialogTrigger asChild>
              <Button>Create Session</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create Session</DialogTitle>
              </DialogHeader>
              <SessionForm />
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="sessions">
          <TabsList>
            <TabsTrigger value="sessions">Sessions</TabsTrigger>
            <TabsTrigger value="class-types">Class Types</TabsTrigger>
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
          </TabsList>

          <TabsContent value="sessions">
            <SessionList />
          </TabsContent>

          <TabsContent value="class-types">
            <ClassTypeManager />
          </TabsContent>

          <TabsContent value="calendar">
            <SessionCalendar />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  )
}
