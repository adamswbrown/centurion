"use client"

import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Loader2, Check, X, Settings2 } from "lucide-react"
import {
  updateMemberCheckInFrequency,
  getMemberEffectiveFrequency,
} from "@/app/actions/members"
import { cn } from "@/lib/utils"

interface CheckInFrequencyOverrideProps {
  memberId: number
  currentOverride: number | null
  cohortDefault?: number | null
  compact?: boolean
}

const FREQUENCY_OPTIONS = [
  { value: "1", label: "Daily", description: "Every day" },
  { value: "2", label: "Every 2 days", description: "Twice per week min" },
  { value: "3", label: "Every 3 days", description: "2-3 times per week" },
  { value: "7", label: "Weekly", description: "Once per week" },
]

export function CheckInFrequencyOverride({
  memberId,
  currentOverride,
  cohortDefault,
  compact = false,
}: CheckInFrequencyOverrideProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [selectedValue, setSelectedValue] = useState<string | null>(
    currentOverride?.toString() ?? null
  )
  const queryClient = useQueryClient()

  // Fetch effective frequency
  const { data: effectiveData } = useQuery({
    queryKey: ["member-frequency", memberId],
    queryFn: () => getMemberEffectiveFrequency(memberId),
    staleTime: 1000 * 60 * 5,
  })

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (frequencyDays: number | null) =>
      updateMemberCheckInFrequency({ memberId, frequencyDays }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["member-frequency", memberId] })
      queryClient.invalidateQueries({ queryKey: ["clientAttention", memberId] })
      setIsEditing(false)
    },
  })

  const handleSave = () => {
    const newValue = selectedValue === "inherit" ? null : Number(selectedValue)
    updateMutation.mutate(newValue)
  }

  const handleCancel = () => {
    setSelectedValue(currentOverride?.toString() ?? null)
    setIsEditing(false)
  }

  const effectiveFrequency = effectiveData?.frequencyDays ?? cohortDefault ?? 1
  const source = effectiveData?.source ?? "system"

  const getFrequencyLabel = (days: number) => {
    const option = FREQUENCY_OPTIONS.find((o) => o.value === days.toString())
    return option?.label ?? `Every ${days} days`
  }

  if (compact && !isEditing) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm">
          {getFrequencyLabel(effectiveFrequency)}
        </span>
        <Badge variant="outline" className="text-xs">
          {source === "user" ? "Override" : source === "cohort" ? "Cohort" : "Default"}
        </Badge>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => setIsEditing(true)}
        >
          <Settings2 className="h-3 w-3" />
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Check-in Frequency</Label>
        {!isEditing && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => setIsEditing(true)}
          >
            <Settings2 className="h-3 w-3 mr-1" />
            Edit
          </Button>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-2">
          <Select
            value={selectedValue ?? "inherit"}
            onValueChange={setSelectedValue}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select frequency" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="inherit">
                <div className="flex items-center gap-2">
                  <span>Use default</span>
                  <span className="text-xs text-muted-foreground">
                    ({cohortDefault ? `Cohort: ${getFrequencyLabel(cohortDefault)}` : "System default"})
                  </span>
                </div>
              </SelectItem>
              {FREQUENCY_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex items-center gap-2">
                    <span>{option.label}</span>
                    <span className="text-xs text-muted-foreground">
                      ({option.description})
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={handleSave}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              <span className="ml-1">Save</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCancel}
              disabled={updateMutation.isPending}
            >
              <X className="h-4 w-4" />
              <span className="ml-1">Cancel</span>
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "text-sm font-medium",
              source === "user" && "text-primary"
            )}
          >
            {getFrequencyLabel(effectiveFrequency)}
          </span>
          <Badge
            variant={source === "user" ? "default" : "outline"}
            className="text-xs"
          >
            {source === "user" ? "Custom" : source === "cohort" ? "Cohort" : "Default"}
          </Badge>
        </div>
      )}

      {!isEditing && source !== "user" && cohortDefault && (
        <p className="text-xs text-muted-foreground">
          Using cohort default. Click edit to override for this member.
        </p>
      )}
    </div>
  )
}
