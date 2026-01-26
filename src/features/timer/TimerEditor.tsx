"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { IntervalPreset, IntervalStep } from "./types"
import { cn } from "@/lib/utils"

const phases: IntervalStep["phase"][] = ["warmup", "work", "rest", "cooldown", "transition"]

function formatSeconds(ms: number) {
  return Math.max(Math.round(ms / 1000), 1)
}

export function TimerEditor({
  presets,
  currentPresetId,
  updatePreset,
  addPreset,
  deletePreset,
  selectPreset,
}: {
  presets: IntervalPreset[]
  currentPresetId: string
  updatePreset: (preset: IntervalPreset) => void
  addPreset: (base?: IntervalPreset) => void
  deletePreset: (presetId: string) => void
  selectPreset: (presetId: string) => void
}) {
  const currentPreset = useMemo(
    () => presets.find((preset) => preset.id === currentPresetId),
    [presets, currentPresetId],
  )

  const [draft, setDraft] = useState<IntervalPreset | null>(currentPreset ?? null)

  useEffect(() => {
    setDraft(currentPreset ?? null)
  }, [currentPreset])

  if (!draft) {
    return null
  }

  const updateStep = (index: number, patch: Partial<IntervalStep>) => {
    setDraft((prev) => {
      if (!prev) return prev
      const nextSteps = prev.steps.map((step, idx) =>
        idx === index ? { ...step, ...patch } : step,
      )
      return { ...prev, steps: nextSteps }
    })
  }

  const removeStep = (index: number) => {
    setDraft((prev) => {
      if (!prev) return prev
      const nextSteps = prev.steps.filter((_, idx) => idx !== index)
      return { ...prev, steps: nextSteps.length ? nextSteps : prev.steps }
    })
  }

  const addStep = () => {
    setDraft((prev) => {
      if (!prev) return prev
      const nextStep: IntervalStep = {
        id: `step-${Date.now()}`,
        label: "New Step",
        durationMs: 30_000,
        phase: "work",
      }
      return { ...prev, steps: [...prev.steps, nextStep] }
    })
  }

  const saveDraft = () => {
    if (!draft) return
    updatePreset(draft)
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 text-white">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs text-slate-400">Preset Editor</p>
          <h3 className="text-lg font-semibold">{draft.name}</h3>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => addPreset()}
          >
            New Preset
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => addPreset(draft)}
          >
            Duplicate
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => deletePreset(draft.id)}
          >
            Delete
          </Button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="presetName">Preset name</Label>
          <Input
            id="presetName"
            value={draft.name}
            onChange={(event) =>
              setDraft((prev) => (prev ? { ...prev, name: event.target.value } : prev))
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="presetSelect">Switch preset</Label>
          <select
            id="presetSelect"
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
            value={draft.id}
            onChange={(event) => selectPreset(event.target.value)}
          >
            {presets.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {draft.steps.map((step, index) => (
          <div key={step.id} className="rounded-md border border-slate-800 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex-1 min-w-[160px]">
                <Label className="text-xs text-slate-400">Label</Label>
                <Input
                  value={step.label}
                  onChange={(event) => updateStep(index, { label: event.target.value })}
                />
              </div>
              <div className="w-28">
                <Label className="text-xs text-slate-400">Seconds</Label>
                <Input
                  type="number"
                  min={1}
                  value={formatSeconds(step.durationMs)}
                  onChange={(event) =>
                    updateStep(index, {
                      durationMs: Math.max(Number(event.target.value), 1) * 1000,
                    })
                  }
                />
              </div>
              <div className="w-32">
                <Label className="text-xs text-slate-400">Phase</Label>
                <select
                  className={cn(
                    "w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white",
                  )}
                  value={step.phase}
                  onChange={(event) =>
                    updateStep(index, { phase: event.target.value as IntervalStep["phase"] })
                  }
                >
                  {phases.map((phase) => (
                    <option key={phase} value={phase}>
                      {phase}
                    </option>
                  ))}
                </select>
              </div>
              <Button variant="ghost" size="sm" onClick={() => removeStep(index)}>
                Remove
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={addStep}>
          Add Step
        </Button>
        <Button size="sm" onClick={saveDraft}>
          Save Preset
        </Button>
      </div>
    </div>
  )
}
