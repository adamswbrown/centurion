import { IntervalPreset, TimerState } from "./types"

const PRESETS_KEY = "centurion.timer.presets"
const STATE_KEY = "centurion.timer.state"

export function loadPresets(): IntervalPreset[] | null {
  if (typeof window === "undefined") return null
  const raw = window.localStorage.getItem(PRESETS_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as IntervalPreset[]
  } catch {
    return null
  }
}

export function savePresets(presets: IntervalPreset[]) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(PRESETS_KEY, JSON.stringify(presets))
}

export function loadTimerState(): TimerState | null {
  if (typeof window === "undefined") return null
  const raw = window.localStorage.getItem(STATE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as TimerState
  } catch {
    return null
  }
}

export function saveTimerState(state: TimerState) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(STATE_KEY, JSON.stringify(state))
}
