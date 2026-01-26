export type IntervalPhase = "work" | "rest" | "warmup" | "cooldown" | "transition"

export type IntervalStep = {
  id: string
  label: string
  durationMs: number
  phase: IntervalPhase
}

export type IntervalPreset = {
  id: string
  name: string
  steps: IntervalStep[]
}

export type TimerState = {
  presetId: string
  presetName: string
  steps: IntervalStep[]
  currentIndex: number
  isRunning: boolean
  startedAt: number | null
  elapsedMs: number
  muted: boolean
  keepAwake: boolean
}
