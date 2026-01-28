"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useClassTypes } from "@/hooks/useClassTypes"
import {
  useCohortSessionAccess,
  useSetCohortSessionAccess,
} from "@/hooks/useCohortSessionAccess"

interface SessionAccessManagerProps {
  cohortId: number
}

export function SessionAccessManager({ cohortId }: SessionAccessManagerProps) {
  const { data: classTypes, isLoading: loadingClassTypes } = useClassTypes({ activeOnly: true })
  const { data: currentAccess, isLoading: loadingAccess } = useCohortSessionAccess(cohortId)
  const setAccess = useSetCohortSessionAccess()

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    if (currentAccess && !initialized) {
      setSelectedIds(new Set(currentAccess.map((a) => a.classType.id)))
      setInitialized(true)
    }
  }, [currentAccess, initialized])

  const isLoading = loadingClassTypes || loadingAccess

  const handleToggle = (classTypeId: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(classTypeId)) {
        next.delete(classTypeId)
      } else {
        next.add(classTypeId)
      }
      return next
    })
  }

  const handleSave = () => {
    setAccess.mutate({
      cohortId,
      classTypeIds: Array.from(selectedIds),
    })
  }

  const currentAccessIds = new Set(currentAccess?.map((a) => a.classType.id) ?? [])
  const hasChanges =
    initialized &&
    (selectedIds.size !== currentAccessIds.size ||
      Array.from(selectedIds).some((id) => !currentAccessIds.has(id)))

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Session Access</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </CardContent>
      </Card>
    )
  }

  if (!classTypes || classTypes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Session Access</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No class types configured. Create class types first to manage session access.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Session Access</CardTitle>
          {hasChanges && (
            <Button
              size="sm"
              onClick={handleSave}
              disabled={setAccess.isPending}
            >
              {setAccess.isPending ? "Saving..." : "Save Changes"}
            </Button>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Select which class types members of this cohort can register for.
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {classTypes.map((ct) => (
            <label
              key={ct.id}
              className="flex items-center gap-3 rounded-md border p-3 cursor-pointer hover:bg-muted/50 transition-colors"
            >
              <input
                type="checkbox"
                checked={selectedIds.has(ct.id)}
                onChange={() => handleToggle(ct.id)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <div>
                <div className="text-sm font-medium">{ct.name}</div>
                {ct.description && (
                  <div className="text-xs text-muted-foreground">{ct.description}</div>
                )}
              </div>
            </label>
          ))}
        </div>

        {setAccess.isError && (
          <div className="mt-3 rounded-md border border-destructive/40 bg-destructive/10 p-2 text-sm text-destructive">
            {setAccess.error instanceof Error
              ? setAccess.error.message
              : "Failed to update session access"}
          </div>
        )}
        {setAccess.isSuccess && (
          <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 p-2 text-sm text-emerald-700">
            Session access updated successfully
          </div>
        )}
      </CardContent>
    </Card>
  )
}
