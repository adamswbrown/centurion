"use client"

import { useState } from "react"
import { Plus, Pencil, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  useMembershipPlans,
  useCreateMembershipPlan,
  useUpdateMembershipPlan,
  useDeactivateMembershipPlan,
} from "@/hooks/useMemberships"
import type { CreateMembershipPlanInput } from "@/app/actions/memberships"

type MembershipPlanType = "RECURRING" | "PACK" | "PREPAID"

interface PlanFormData {
  name: string
  description: string
  type: MembershipPlanType
  sessionsPerWeek: string
  commitmentMonths: string
  monthlyPrice: string
  totalSessions: string
  packPrice: string
  durationDays: string
  prepaidPrice: string
  lateCancelCutoffHours: string
  purchasableByClient: boolean
  isActive: boolean
}

const defaultFormData: PlanFormData = {
  name: "",
  description: "",
  type: "RECURRING",
  sessionsPerWeek: "",
  commitmentMonths: "",
  monthlyPrice: "",
  totalSessions: "",
  packPrice: "",
  durationDays: "",
  prepaidPrice: "",
  lateCancelCutoffHours: "",
  purchasableByClient: true,
  isActive: true,
}

function getTypeBadgeVariant(type: MembershipPlanType) {
  switch (type) {
    case "RECURRING":
      return "default" as const
    case "PACK":
      return "secondary" as const
    case "PREPAID":
      return "outline" as const
  }
}

function formatPlanPrice(plan: {
  type: MembershipPlanType
  monthlyPrice?: unknown
  packPrice?: unknown
  prepaidPrice?: unknown
}): string {
  switch (plan.type) {
    case "RECURRING":
      return plan.monthlyPrice != null ? `$${(Number(plan.monthlyPrice) / 100).toFixed(2)}/mo` : "-"
    case "PACK":
      return plan.packPrice != null ? `$${(Number(plan.packPrice) / 100).toFixed(2)}` : "-"
    case "PREPAID":
      return plan.prepaidPrice != null ? `$${(Number(plan.prepaidPrice) / 100).toFixed(2)}` : "-"
  }
}

function formatSessionsInfo(plan: {
  type: MembershipPlanType
  sessionsPerWeek?: number | null
  totalSessions?: number | null
  durationDays?: number | null
}): string {
  switch (plan.type) {
    case "RECURRING":
      return plan.sessionsPerWeek ? `${plan.sessionsPerWeek}/week` : "-"
    case "PACK":
      return plan.totalSessions ? `${plan.totalSessions} sessions` : "-"
    case "PREPAID":
      return plan.durationDays ? `${plan.durationDays} days` : "-"
  }
}

export function MembershipPlanManager() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingPlanId, setEditingPlanId] = useState<number | null>(null)
  const [formData, setFormData] = useState<PlanFormData>(defaultFormData)

  const { data: plans, isLoading } = useMembershipPlans()
  const createPlan = useCreateMembershipPlan()
  const updatePlan = useUpdateMembershipPlan()
  const deactivatePlan = useDeactivateMembershipPlan()

  const resetForm = () => {
    setFormData(defaultFormData)
    setEditingPlanId(null)
  }

  const openCreateDialog = () => {
    resetForm()
    setDialogOpen(true)
  }

  const openEditDialog = (plan: {
    id: number
    name: string
    description: string | null
    type: MembershipPlanType
    sessionsPerWeek: number | null
    commitmentMonths: number | null
    monthlyPrice: unknown
    totalSessions: number | null
    packPrice: unknown
    durationDays: number | null
    prepaidPrice: unknown
    lateCancelCutoffHours: number | null
    purchasableByClient: boolean
    isActive: boolean
  }) => {
    setEditingPlanId(plan.id)
    setFormData({
      name: plan.name,
      description: plan.description ?? "",
      type: plan.type,
      sessionsPerWeek: plan.sessionsPerWeek?.toString() ?? "",
      commitmentMonths: plan.commitmentMonths?.toString() ?? "",
      monthlyPrice: plan.monthlyPrice != null ? (Number(plan.monthlyPrice) / 100).toFixed(2) : "",
      totalSessions: plan.totalSessions?.toString() ?? "",
      packPrice: plan.packPrice != null ? (Number(plan.packPrice) / 100).toFixed(2) : "",
      durationDays: plan.durationDays?.toString() ?? "",
      prepaidPrice: plan.prepaidPrice != null ? (Number(plan.prepaidPrice) / 100).toFixed(2) : "",
      lateCancelCutoffHours: plan.lateCancelCutoffHours?.toString() ?? "",
      purchasableByClient: plan.purchasableByClient,
      isActive: plan.isActive,
    })
    setDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const payload: Record<string, unknown> = {
      name: formData.name,
      description: formData.description || null,
      type: formData.type,
      lateCancelCutoffHours: formData.lateCancelCutoffHours
        ? parseInt(formData.lateCancelCutoffHours, 10)
        : null,
      purchasableByClient: formData.purchasableByClient,
      isActive: formData.isActive,
    }

    switch (formData.type) {
      case "RECURRING":
        payload.sessionsPerWeek = formData.sessionsPerWeek
          ? parseInt(formData.sessionsPerWeek, 10)
          : null
        payload.commitmentMonths = formData.commitmentMonths
          ? parseInt(formData.commitmentMonths, 10)
          : null
        payload.monthlyPrice = formData.monthlyPrice
          ? Math.round(parseFloat(formData.monthlyPrice) * 100)
          : null
        break
      case "PACK":
        payload.totalSessions = formData.totalSessions
          ? parseInt(formData.totalSessions, 10)
          : null
        payload.packPrice = formData.packPrice
          ? Math.round(parseFloat(formData.packPrice) * 100)
          : null
        break
      case "PREPAID":
        payload.durationDays = formData.durationDays
          ? parseInt(formData.durationDays, 10)
          : null
        payload.prepaidPrice = formData.prepaidPrice
          ? Math.round(parseFloat(formData.prepaidPrice) * 100)
          : null
        break
    }

    if (editingPlanId) {
      await updatePlan.mutateAsync({ id: editingPlanId, ...payload })
    } else {
      await createPlan.mutateAsync(payload as CreateMembershipPlanInput)
    }

    setDialogOpen(false)
    resetForm()
  }

  const updateField = (field: keyof PlanFormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading membership plans...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Membership Plans</h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Create Plan
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>
                  {editingPlanId ? "Edit Plan" : "Create Membership Plan"}
                </DialogTitle>
                <DialogDescription>
                  {editingPlanId
                    ? "Update the membership plan details."
                    : "Configure a new membership plan for your clients."}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {/* Common Fields */}
                <div className="space-y-2">
                  <Label htmlFor="plan-name">Name</Label>
                  <Input
                    id="plan-name"
                    value={formData.name}
                    onChange={(e) => updateField("name", e.target.value)}
                    placeholder="e.g., Premium Monthly"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="plan-description">Description</Label>
                  <Textarea
                    id="plan-description"
                    value={formData.description}
                    onChange={(e) => updateField("description", e.target.value)}
                    placeholder="Brief description of the plan"
                    maxLength={500}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="plan-type">Type</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => updateField("type", value)}
                  >
                    <SelectTrigger id="plan-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="RECURRING">Recurring (Monthly)</SelectItem>
                      <SelectItem value="PACK">Session Pack</SelectItem>
                      <SelectItem value="PREPAID">Prepaid (Fixed Duration)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Type-specific Fields */}
                {formData.type === "RECURRING" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="sessions-per-week">Sessions/Week</Label>
                      <Input
                        id="sessions-per-week"
                        type="number"
                        min="1"
                        value={formData.sessionsPerWeek}
                        onChange={(e) => updateField("sessionsPerWeek", e.target.value)}
                        placeholder="e.g., 3"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="commitment-months">Commitment (months)</Label>
                      <Input
                        id="commitment-months"
                        type="number"
                        min="1"
                        value={formData.commitmentMonths}
                        onChange={(e) => updateField("commitmentMonths", e.target.value)}
                        placeholder="e.g., 12"
                      />
                    </div>
                    <div className="col-span-2 space-y-2">
                      <Label htmlFor="monthly-price">Monthly Price ($)</Label>
                      <Input
                        id="monthly-price"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.monthlyPrice}
                        onChange={(e) => updateField("monthlyPrice", e.target.value)}
                        placeholder="e.g., 199.00"
                      />
                    </div>
                  </div>
                )}

                {formData.type === "PACK" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="total-sessions">Total Sessions</Label>
                      <Input
                        id="total-sessions"
                        type="number"
                        min="1"
                        value={formData.totalSessions}
                        onChange={(e) => updateField("totalSessions", e.target.value)}
                        placeholder="e.g., 10"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pack-price">Pack Price ($)</Label>
                      <Input
                        id="pack-price"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.packPrice}
                        onChange={(e) => updateField("packPrice", e.target.value)}
                        placeholder="e.g., 499.00"
                      />
                    </div>
                  </div>
                )}

                {formData.type === "PREPAID" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="duration-days">Duration (days)</Label>
                      <Input
                        id="duration-days"
                        type="number"
                        min="1"
                        value={formData.durationDays}
                        onChange={(e) => updateField("durationDays", e.target.value)}
                        placeholder="e.g., 30"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="prepaid-price">Prepaid Price ($)</Label>
                      <Input
                        id="prepaid-price"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.prepaidPrice}
                        onChange={(e) => updateField("prepaidPrice", e.target.value)}
                        placeholder="e.g., 299.00"
                      />
                    </div>
                  </div>
                )}

                {/* Common Optional Fields */}
                <div className="space-y-2">
                  <Label htmlFor="late-cancel">Late Cancel Cutoff (hours)</Label>
                  <Input
                    id="late-cancel"
                    type="number"
                    min="0"
                    value={formData.lateCancelCutoffHours}
                    onChange={(e) => updateField("lateCancelCutoffHours", e.target.value)}
                    placeholder="e.g., 24"
                  />
                </div>

                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={formData.purchasableByClient}
                      onChange={(e) => updateField("purchasableByClient", e.target.checked)}
                      className="rounded border-input"
                    />
                    Client can purchase
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => updateField("isActive", e.target.checked)}
                      className="rounded border-input"
                    />
                    Active
                  </label>
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createPlan.isPending || updatePlan.isPending}
                >
                  {createPlan.isPending || updatePlan.isPending
                    ? "Saving..."
                    : editingPlanId
                    ? "Update Plan"
                    : "Create Plan"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Plans Table */}
      {!plans || plans.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            No membership plans yet. Create your first plan to get started.
          </p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Sessions</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {plans.map((plan) => (
              <TableRow key={plan.id}>
                <TableCell className="font-medium">{plan.name}</TableCell>
                <TableCell>
                  <Badge variant={getTypeBadgeVariant(plan.type)}>{plan.type}</Badge>
                </TableCell>
                <TableCell className="font-mono">{formatPlanPrice(plan)}</TableCell>
                <TableCell>{formatSessionsInfo(plan)}</TableCell>
                <TableCell>
                  <Badge variant={plan.isActive ? "default" : "secondary"}>
                    {plan.isActive ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(plan)}
                      aria-label="Edit plan"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deactivatePlan.mutate(plan.id)}
                      disabled={deactivatePlan.isPending}
                      aria-label="Deactivate plan"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
