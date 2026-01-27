"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  createCustomCohortType,
  deleteCustomCohortType,
} from "@/app/actions/cohort-types"

interface CustomCohortType {
  id: number
  label: string
  description: string | null
  _count: { cohorts: number }
  creator: { name: string | null; email: string }
}

interface CustomCohortTypeManagerProps {
  initialTypes: CustomCohortType[]
}

export function CustomCohortTypeManager({
  initialTypes,
}: CustomCohortTypeManagerProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newLabel, setNewLabel] = useState("")
  const [newDescription, setNewDescription] = useState("")

  async function handleCreate() {
    if (!newLabel.trim()) {
      setError("Label is required")
      return
    }

    setError(null)
    setLoading(true)

    try {
      await createCustomCohortType({
        label: newLabel.trim(),
        description: newDescription.trim() || undefined,
      })
      setNewLabel("")
      setNewDescription("")
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create type")
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Are you sure you want to delete this custom cohort type?")) return

    setLoading(true)
    setError(null)

    try {
      await deleteCustomCohortType(id)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete type")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Create New Type */}
      <Card>
        <CardHeader>
          <CardTitle>Create Custom Type</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="newLabel">Label</Label>
              <Input
                id="newLabel"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="e.g., Weight Loss Program"
                maxLength={50}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newDescription">Description (optional)</Label>
              <Input
                id="newDescription"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Brief description of this type"
                maxLength={255}
              />
            </div>
          </div>

          {error && (
            <div role="alert" className="text-destructive text-sm">
              {error}
            </div>
          )}

          <Button onClick={handleCreate} disabled={loading}>
            {loading ? "Creating..." : "Create Type"}
          </Button>
        </CardContent>
      </Card>

      {/* Existing Types */}
      <Card>
        <CardHeader>
          <CardTitle>Existing Custom Types</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Label</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Used By</TableHead>
                <TableHead>Created By</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {initialTypes.map((type) => (
                <TableRow key={type.id}>
                  <TableCell className="font-medium">{type.label}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {type.description || "-"}
                  </TableCell>
                  <TableCell>
                    {type._count.cohorts} cohort{type._count.cohorts !== 1 ? "s" : ""}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {type.creator.name || type.creator.email}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(type.id)}
                      disabled={loading || type._count.cohorts > 0}
                      title={
                        type._count.cohorts > 0
                          ? "Cannot delete: in use by cohorts"
                          : "Delete this custom type"
                      }
                    >
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {initialTypes.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center text-muted-foreground py-8"
                  >
                    No custom cohort types defined yet. Create one above.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Info about built-in types */}
      <Card>
        <CardHeader>
          <CardTitle>Built-in Types</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="p-3 border rounded-md">
              <h3 className="font-medium">Timed</h3>
              <p className="text-sm text-muted-foreground">
                Has a fixed start and end date. Best for bootcamps and programs with a defined duration.
              </p>
            </div>
            <div className="p-3 border rounded-md">
              <h3 className="font-medium">Ongoing</h3>
              <p className="text-sm text-muted-foreground">
                No fixed end date. Members join and stay for an optional membership duration.
              </p>
            </div>
            <div className="p-3 border rounded-md">
              <h3 className="font-medium">Challenge</h3>
              <p className="text-sm text-muted-foreground">
                A time-limited challenge program with specific goals and milestones.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
