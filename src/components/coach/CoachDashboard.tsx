"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CoachMembersTable } from "./CoachMembersTable"
import { CoachQuestionnaireStatus } from "./CoachQuestionnaireStatus"
import { ReviewQueueDashboard } from "@/features/review-queue/ReviewQueueDashboard"

export function CoachDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Coach Dashboard</h1>
        <p className="text-muted-foreground">
          Monitor member engagement, review check-ins, and track questionnaire completion
        </p>
      </div>

      <Tabs defaultValue="members">
        <TabsList>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="review">Weekly Review</TabsTrigger>
          <TabsTrigger value="questionnaires">Questionnaires</TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="mt-4">
          <CoachMembersTable />
        </TabsContent>

        <TabsContent value="review" className="mt-4">
          <ReviewQueueDashboard />
        </TabsContent>

        <TabsContent value="questionnaires" className="mt-4">
          <CoachQuestionnaireStatus />
        </TabsContent>
      </Tabs>
    </div>
  )
}
