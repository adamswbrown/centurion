"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  getCheckInConfig,
  updateCheckInConfig,
  type CheckInConfig,
} from "@/app/actions/cohorts"
import { ALL_CHECK_IN_PROMPTS } from "@/lib/check-in-prompts"

interface CheckInConfigEditorProps {
  cohortId: number
}

export function CheckInConfigEditor({ cohortId }: CheckInConfigEditorProps) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [enabledPrompts, setEnabledPrompts] = useState<string[]>([])
  const [customPrompt1, setCustomPrompt1] = useState<string>("")
  const [customPrompt1Type, setCustomPrompt1Type] = useState<"scale" | "text" | "number" | "">("")

  useEffect(() => {
    loadConfig()
  }, [cohortId])

  const loadConfig = async () => {
    setLoading(true)
    setError(null)
    try {
      const config = await getCheckInConfig(cohortId)
      setEnabledPrompts(config.enabledPrompts || [])
      setCustomPrompt1(config.customPrompt1 || "")
      setCustomPrompt1Type((config.customPrompt1Type as "scale" | "text" | "number") || "")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load config")
    } finally {
      setLoading(false)
    }
  }

  const handleTogglePrompt = (promptKey: string) => {
    const prompt = ALL_CHECK_IN_PROMPTS.find((p) => p.key === promptKey)
    if (prompt?.mandatory) return // Can't toggle mandatory prompts

    setEnabledPrompts((prev) =>
      prev.includes(promptKey)
        ? prev.filter((p) => p !== promptKey)
        : [...prev, promptKey]
    )
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      const config: CheckInConfig = {
        enabledPrompts,
        customPrompt1: customPrompt1 || null,
        customPrompt1Type: customPrompt1Type || null,
      }

      await updateCheckInConfig(cohortId, config)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save config")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Loading check-in settings...
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Check-In Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
            Settings saved successfully!
          </div>
        )}

        {/* Standard Prompts */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Standard Prompts</Label>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {ALL_CHECK_IN_PROMPTS.map((prompt) => (
              <div
                key={prompt.key}
                className={`flex items-center justify-between rounded-lg border p-3 ${
                  enabledPrompts.includes(prompt.key)
                    ? "bg-primary/5 border-primary/20"
                    : "bg-muted/50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={prompt.key}
                    checked={enabledPrompts.includes(prompt.key)}
                    onChange={() => handleTogglePrompt(prompt.key)}
                    disabled={prompt.mandatory}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <label
                    htmlFor={prompt.key}
                    className={`text-sm ${prompt.mandatory ? "cursor-not-allowed" : "cursor-pointer"}`}
                  >
                    {prompt.label}
                  </label>
                </div>
                {prompt.mandatory && (
                  <Badge variant="secondary" className="text-xs">
                    Required
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Custom Prompt */}
        <div className="space-y-3 border-t pt-4">
          <Label className="text-sm font-medium">Custom Prompt (Optional)</Label>
          <p className="text-xs text-muted-foreground">
            Add a cohort-specific question to gather additional data from members.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="customPrompt1" className="text-xs">
                Question Label
              </Label>
              <Input
                id="customPrompt1"
                value={customPrompt1}
                onChange={(e) => setCustomPrompt1(e.target.value)}
                placeholder="e.g., How are you feeling today?"
                maxLength={100}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customPrompt1Type" className="text-xs">
                Response Type
              </Label>
              <Select
                value={customPrompt1Type}
                onValueChange={(v) =>
                  setCustomPrompt1Type(v as "scale" | "text" | "number")
                }
              >
                <SelectTrigger id="customPrompt1Type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scale">Scale (1-10)</SelectItem>
                  <SelectItem value="number">Number</SelectItem>
                  <SelectItem value="text">Text</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
