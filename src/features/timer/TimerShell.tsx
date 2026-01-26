"use client"

import { useEffect, useMemo } from "react"
import { useIntervalTimer } from "./useIntervalTimer"
import { defaultPresets } from "./presets"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { TimerLimitations } from "@/app/timer/limitations"
import { TimerEditor } from "@/features/timer/TimerEditor"

function formatMs(ms: number) {
  const totalSeconds = Math.ceil(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, "0")}`
}

export function TimerShell() {
  const {
    presets,
    state,
    currentStep,
    remainingMs,
    warning,
    setWarning,
    start,
    pause,
    reset,
    selectPreset,
    toggleMute,
    toggleWakeLock,
    updatePreset,
    addPreset,
    deletePreset,
  } = useIntervalTimer()

  useEffect(() => {
    if (!warning) return
    const timer = setTimeout(() => setWarning(null), 3500)
    return () => clearTimeout(timer)
  }, [warning, setWarning])

  const presetOptions = useMemo(() => {
    return presets.length ? presets : defaultPresets
  }, [presets])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex flex-col gap-6">
          <header className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm text-slate-400">Centurion</p>
              <h1 className="text-3xl font-semibold">Interval Timer</h1>
              <p className="text-sm text-slate-400">
                Standalone PWA. Keep the screen awake for best accuracy.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={state.muted ? "secondary" : "outline"}
                onClick={toggleMute}
              >
                {state.muted ? "Muted" : "Sound On"}
              </Button>
              <Button
                variant={state.keepAwake ? "default" : "outline"}
                onClick={toggleWakeLock}
              >
                {state.keepAwake ? "Screen Awake" : "Keep Awake"}
              </Button>
            </div>
          </header>

          {warning && (
            <div className="rounded-md border border-amber-400/40 bg-amber-400/10 p-3 text-sm text-amber-200">
              {warning}
            </div>
          )}

          <section className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
            <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Current</p>
                  <h2 className="text-2xl font-semibold">{currentStep.label}</h2>
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    "border-slate-700 text-slate-300",
                    currentStep.phase === "work" && "border-emerald-400 text-emerald-200",
                    currentStep.phase === "rest" && "border-amber-400 text-amber-200",
                    currentStep.phase === "warmup" && "border-blue-400 text-blue-200",
                    currentStep.phase === "cooldown" && "border-purple-400 text-purple-200",
                  )}
                >
                  {currentStep.phase}
                </Badge>
              </div>
              <div className="mt-6 text-center">
                <p className="text-sm text-slate-400">Time Remaining</p>
                <p className="mt-2 text-6xl font-semibold tracking-tight">
                  {formatMs(remainingMs)}
                </p>
              </div>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <Button
                  onClick={state.isRunning ? pause : start}
                  size="lg"
                >
                  {state.isRunning ? "Pause" : "Start"}
                </Button>
                <Button variant="outline" onClick={reset}>
                  Reset
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
                <p className="text-sm text-slate-400">Preset</p>
                <select
                  className="mt-2 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                  value={state.presetId}
                  onChange={(event) => selectPreset(event.target.value)}
                >
                  {presetOptions.map((preset) => (
                    <option key={preset.id} value={preset.id}>
                      {preset.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
                <p className="text-sm text-slate-400">Steps</p>
                <div className="mt-3 space-y-2">
                  {state.steps.map((step, index) => (
                    <div
                      key={step.id}
                      className={cn(
                        "flex items-center justify-between rounded-md border border-slate-800 px-3 py-2 text-sm",
                        index === state.currentIndex && "border-emerald-400/60 bg-emerald-500/10",
                      )}
                    >
                      <span>{step.label}</span>
                      <span className="text-slate-400">{formatMs(step.durationMs)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <TimerLimitations />
            </div>
          </section>

          <TimerEditor
            presets={presets}
            currentPresetId={state.presetId}
            updatePreset={updatePreset}
            addPreset={addPreset}
            deletePreset={deletePreset}
            selectPreset={selectPreset}
          />
        </div>
      </div>
    </div>
  )
}
