"use client"

import { useState } from "react"
import Link from "next/link"
import { format } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { deleteQuestionnaireBundle } from "@/app/actions/questionnaires"
import { useRouter } from "next/navigation"
import { Edit, Trash2, FileText } from "lucide-react"

interface Bundle {
  id: number
  cohortId: number
  weekNumber: number
  isActive: boolean
  cohort: {
    id: number
    name: string
    startDate: Date
  }
  _count: {
    responses: number
  }
}

interface Cohort {
  id: number
  name: string
}

interface QuestionnaireListProps {
  bundles: Bundle[]
  cohorts: Cohort[]
}

export function QuestionnaireList({ bundles, cohorts }: QuestionnaireListProps) {
  const router = useRouter()
  const [deleting, setDeleting] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Group bundles by cohort
  const bundlesByCohort = bundles.reduce(
    (acc, bundle) => {
      const cohortId = bundle.cohortId
      if (!acc[cohortId]) {
        acc[cohortId] = {
          cohort: bundle.cohort,
          bundles: [],
        }
      }
      acc[cohortId].bundles.push(bundle)
      return acc
    },
    {} as Record<number, { cohort: Bundle["cohort"]; bundles: Bundle[] }>
  )

  const handleDelete = async (cohortId: number, weekNumber: number) => {
    setDeleting(cohortId * 100 + weekNumber)
    setError(null)
    try {
      await deleteQuestionnaireBundle(cohortId, weekNumber)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete")
    } finally {
      setDeleting(null)
    }
  }

  if (bundles.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-medium">No questionnaire bundles</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Create a new bundle to get started.
          </p>
          <Link href="/admin/questionnaires/new">
            <Button className="mt-4">Create Bundle</Button>
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {Object.entries(bundlesByCohort).map(([cohortId, { cohort, bundles: cohortBundles }]) => (
        <Card key={cohortId}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">{cohort.name}</CardTitle>
              <Badge variant="secondary">
                Started {format(new Date(cohort.startDate), "MMM d, yyyy")}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {cohortBundles
                .sort((a, b) => a.weekNumber - b.weekNumber)
                .map((bundle) => (
                  <div
                    key={bundle.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-4">
                      <Badge variant={bundle.isActive ? "default" : "secondary"}>
                        Week {bundle.weekNumber}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {bundle._count.responses} response(s)
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/admin/questionnaires/${bundle.cohortId}?week=${bundle.weekNumber}`}
                      >
                        <Button variant="outline" size="sm">
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </Button>
                      </Link>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={deleting === bundle.cohortId * 100 + bundle.weekNumber}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Week {bundle.weekNumber}?</AlertDialogTitle>
                            <AlertDialogDescription>
                              {bundle._count.responses > 0
                                ? `This bundle has ${bundle._count.responses} response(s). You must delete responses first.`
                                : "This will permanently delete this questionnaire. This action cannot be undone."}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(bundle.cohortId, bundle.weekNumber)}
                              disabled={bundle._count.responses > 0}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Show cohorts without bundles */}
      {cohorts
        .filter((c) => !bundlesByCohort[c.id])
        .map((cohort) => (
          <Card key={cohort.id} className="border-dashed">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg text-muted-foreground">{cohort.name}</CardTitle>
                <Badge variant="outline">No bundles</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <Link href={`/admin/questionnaires/new?cohort=${cohort.id}`}>
                <Button variant="outline" className="w-full">
                  Create Questionnaire Bundle
                </Button>
              </Link>
            </CardContent>
          </Card>
        ))}
    </div>
  )
}
