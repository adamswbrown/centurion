"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Plus, Pencil, Trash2 } from "lucide-react"
import {
  useClassTypes,
  useCreateClassType,
  useUpdateClassType,
  useDeleteClassType,
} from "@/hooks/useClassTypes"

interface ClassTypeFormData {
  name: string
  description: string
  color: string
  defaultCapacity: number
  defaultDurationMins: number
}

const emptyForm: ClassTypeFormData = {
  name: "",
  description: "",
  color: "#3b82f6",
  defaultCapacity: 12,
  defaultDurationMins: 60,
}

export function ClassTypeManager() {
  const { data: classTypes, isLoading } = useClassTypes()
  const createClassType = useCreateClassType()
  const updateClassType = useUpdateClassType()
  const deleteClassType = useDeleteClassType()

  const [isAddOpen, setIsAddOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formData, setFormData] = useState<ClassTypeFormData>(emptyForm)

  function resetForm() {
    setFormData(emptyForm)
    setEditingId(null)
  }

  function handleAdd() {
    createClassType.mutate(
      {
        name: formData.name,
        description: formData.description || undefined,
        color: formData.color || undefined,
        defaultCapacity: formData.defaultCapacity,
        defaultDurationMins: formData.defaultDurationMins,
      },
      {
        onSuccess: () => {
          resetForm()
          setIsAddOpen(false)
        },
      }
    )
  }

  function handleEdit(ct: {
    id: number
    name: string
    description: string | null
    color: string | null
    defaultCapacity: number
    defaultDurationMins: number
  }) {
    setEditingId(ct.id)
    setFormData({
      name: ct.name,
      description: ct.description ?? "",
      color: ct.color ?? "#3b82f6",
      defaultCapacity: ct.defaultCapacity,
      defaultDurationMins: ct.defaultDurationMins,
    })
  }

  function handleUpdate() {
    if (editingId === null) return

    updateClassType.mutate(
      {
        id: editingId,
        name: formData.name,
        description: formData.description || undefined,
        color: formData.color || undefined,
        defaultCapacity: formData.defaultCapacity,
        defaultDurationMins: formData.defaultDurationMins,
        isActive: true,
      },
      {
        onSuccess: () => resetForm(),
      }
    )
  }

  function handleDelete(id: number) {
    deleteClassType.mutate(id)
  }

  function renderForm(onSubmit: () => void, submitLabel: string) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="ct-name">Name</Label>
          <Input
            id="ct-name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g. HIIT, Yoga, Strength"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ct-description">Description</Label>
          <Input
            id="ct-description"
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            placeholder="Optional description"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="ct-color">Color</Label>
            <div className="flex items-center gap-2">
              <input
                id="ct-color"
                type="color"
                value={formData.color}
                onChange={(e) =>
                  setFormData({ ...formData, color: e.target.value })
                }
                className="h-9 w-12 cursor-pointer rounded border"
              />
              <span className="text-sm text-muted-foreground">
                {formData.color}
              </span>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ct-capacity">Default Capacity</Label>
            <Input
              id="ct-capacity"
              type="number"
              min={1}
              value={formData.defaultCapacity}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  defaultCapacity: Number(e.target.value),
                })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ct-duration">Duration (mins)</Label>
            <Input
              id="ct-duration"
              type="number"
              min={1}
              value={formData.defaultDurationMins}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  defaultDurationMins: Number(e.target.value),
                })
              }
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => {
              resetForm()
              setIsAddOpen(false)
            }}
          >
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={!formData.name.trim()}>
            {submitLabel}
          </Button>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading class types...</p>
  }

  const activeTypes = (classTypes ?? []).filter((ct) => ct.isActive)
  const inactiveTypes = (classTypes ?? []).filter((ct) => !ct.isActive)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Class Types</h2>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button
              size="sm"
              onClick={() => {
                resetForm()
                setIsAddOpen(true)
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Class Type
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Class Type</DialogTitle>
            </DialogHeader>
            {renderForm(handleAdd, "Create")}
          </DialogContent>
        </Dialog>
      </div>

      {activeTypes.length === 0 && inactiveTypes.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No class types yet. Add one to get started.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Color</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Capacity</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {activeTypes.map((ct) => (
              <TableRow key={ct.id}>
                <TableCell>
                  <div
                    className="h-5 w-5 rounded-full border"
                    style={{ backgroundColor: ct.color ?? "#3b82f6" }}
                  />
                </TableCell>
                <TableCell className="font-medium">
                  {editingId === ct.id ? (
                    <Input
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      className="h-8"
                    />
                  ) : (
                    ct.name
                  )}
                </TableCell>
                <TableCell>{ct.defaultCapacity}</TableCell>
                <TableCell>{ct.defaultDurationMins} min</TableCell>
                <TableCell>
                  <Badge variant="secondary">Active</Badge>
                </TableCell>
                <TableCell className="text-right">
                  {editingId === ct.id ? (
                    <div className="flex justify-end gap-1">
                      <Button size="sm" onClick={handleUpdate}>
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={resetForm}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(ct)}
                        aria-label="Edit class type"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(ct.id)}
                        aria-label="Delete class type"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {inactiveTypes.map((ct) => (
              <TableRow key={ct.id} className="opacity-50">
                <TableCell>
                  <div
                    className="h-5 w-5 rounded-full border"
                    style={{ backgroundColor: ct.color ?? "#3b82f6" }}
                  />
                </TableCell>
                <TableCell className="font-medium">{ct.name}</TableCell>
                <TableCell>{ct.defaultCapacity}</TableCell>
                <TableCell>{ct.defaultDurationMins} min</TableCell>
                <TableCell>
                  <Badge variant="outline">Inactive</Badge>
                </TableCell>
                <TableCell />
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
