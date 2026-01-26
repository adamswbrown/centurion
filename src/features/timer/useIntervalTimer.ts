"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { IntervalPreset, IntervalStep, TimerState } from "./types"
import { defaultPresets } from "./presets"
import { playBeep } from "./beep"
import { loadPresets, loadTimerState, savePresets, saveTimerState } from "./storage"

function buildStateFromPreset(preset: IntervalPreset): TimerState {
  return {
    presetId: preset.id,
    presetName: preset.name,
    steps: preset.steps,
    currentIndex: 0,
    isRunning: false,
    startedAt: null,
    elapsedMs: 0,
    muted: false,
    keepAwake: false,
  }
}

function getCurrentStep(state: TimerState): IntervalStep {
  return state.steps[state.currentIndex]
}

export function useIntervalTimer() {
  const [presets, setPresets] = useState<IntervalPreset[]>(defaultPresets)
  const [state, setState] = useState<TimerState>(() => buildStateFromPreset(defaultPresets[0]))
  const [warning, setWarning] = useState<string | null>(null)
  const tickRef = useRef<number | null>(null)
  const visibilityRef = useRef<number>(Date.now())
  const wakeLockRef = useRef<any>(null)

  useEffect(() => {
    const storedPresets = loadPresets()
    if (storedPresets && storedPresets.length > 0) {
      setPresets(storedPresets)
    }
    const storedState = loadTimerState()
    if (storedState) {
      setState(storedState)
    }
  }, [])

  useEffect(() => {
    savePresets(presets)
  }, [presets])

  useEffect(() => {
    saveTimerState(state)
  }, [state])

  const totalElapsedMs = useMemo(() => {
    if (!state.isRunning || !state.startedAt) return state.elapsedMs
    return state.elapsedMs + (Date.now() - state.startedAt)
  }, [state.elapsedMs, state.isRunning, state.startedAt])

  const currentStep = useMemo(() => getCurrentStep(state), [state])

  const remainingMs = useMemo(() => {
    const stepElapsed = totalElapsedMs
    return Math.max(currentStep.durationMs - stepElapsed, 0)
  }, [currentStep.durationMs, totalElapsedMs])

  const advanceStep = useCallback(() => {
    setState((prev) => {
      const nextIndex = prev.currentIndex + 1
      if (nextIndex >= prev.steps.length) {
        return {
          ...prev,
          currentIndex: prev.steps.length - 1,
          isRunning: false,
          startedAt: null,
          elapsedMs: prev.steps[prev.steps.length - 1].durationMs,
        }
      }
      return {
        ...prev,
        currentIndex: nextIndex,
        startedAt: Date.now(),
        elapsedMs: 0,
      }
    })
  }, [])

  const tick = useCallback(() => {
    setState((prev) => {
      if (!prev.isRunning || !prev.startedAt) return prev
      const elapsed = prev.elapsedMs + (Date.now() - prev.startedAt)
      const current = prev.steps[prev.currentIndex]
      if (elapsed >= current.durationMs) {
        if (!prev.muted) {
          playBeep(current.phase === "work" ? 880 : 520)
        }
        return {
          ...prev,
          currentIndex: Math.min(prev.currentIndex + 1, prev.steps.length - 1),
          startedAt: Date.now(),
          elapsedMs: 0,
          isRunning: prev.currentIndex + 1 < prev.steps.length,
        }
      }
      return {
        ...prev,
        startedAt: Date.now(),
        elapsedMs: elapsed,
      }
    })
    tickRef.current = window.setTimeout(tick, 250)
  }, [])

  const start = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isRunning: true,
      startedAt: Date.now(),
    }))
  }, [])

  const pause = useCallback(() => {
    setState((prev) => {
      if (!prev.startedAt) return { ...prev, isRunning: false }
      return {
        ...prev,
        isRunning: false,
        elapsedMs: prev.elapsedMs + (Date.now() - prev.startedAt),
        startedAt: null,
      }
    })
  }, [])

  const reset = useCallback(() => {
    setState((prev) => ({
      ...prev,
      currentIndex: 0,
      isRunning: false,
      startedAt: null,
      elapsedMs: 0,
    }))
  }, [])

  const selectPreset = useCallback((presetId: string) => {
    const preset = presets.find((item) => item.id === presetId)
    if (!preset) return
    setState(buildStateFromPreset(preset))
  }, [presets])

  const toggleMute = useCallback(() => {
    setState((prev) => ({ ...prev, muted: !prev.muted }))
  }, [])

  const updatePreset = useCallback((preset: IntervalPreset) => {
    setPresets((prev) => {
      const next = prev.map((item) => (item.id === preset.id ? preset : item))
      return next
    })
    setState((prev) => {
      if (prev.presetId !== preset.id) return prev
      return {
        ...prev,
        presetName: preset.name,
        steps: preset.steps,
        currentIndex: Math.min(prev.currentIndex, preset.steps.length - 1),
      }
    })
  }, [])

  const addPreset = useCallback(
    (base?: IntervalPreset) => {
      const id = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `preset-${Date.now()}`
      const newPreset: IntervalPreset = base
        ? {
            ...base,
            id,
            name: `${base.name} Copy`,
            steps: base.steps.map((step, index) => ({
              ...step,
              id: `${id}-step-${index}`,
            })),
          }
        : {
            id,
            name: "New Preset",
            steps: [
              {
                id: `${id}-step-0`,
                label: "Work",
                durationMs: 30_000,
                phase: "work",
              },
              {
                id: `${id}-step-1`,
                label: "Rest",
                durationMs: 15_000,
                phase: "rest",
              },
            ],
          }
      setPresets((prev) => [...prev, newPreset])
      setState(buildStateFromPreset(newPreset))
    },
    [],
  )

  const deletePreset = useCallback(
    (presetId: string) => {
      setPresets((prev) => prev.filter((preset) => preset.id !== presetId))
      setState((prev) => {
        if (prev.presetId !== presetId) return prev
        const fallback = presets.find((preset) => preset.id !== presetId) || defaultPresets[0]
        return buildStateFromPreset(fallback)
      })
    },
    [presets],
  )

  const toggleWakeLock = useCallback(async () => {
    if (typeof window === "undefined") return
    if (!("wakeLock" in navigator)) {
      setWarning("Wake Lock is not supported on this device.")
      return
    }

    if (wakeLockRef.current) {
      await wakeLockRef.current.release()
      wakeLockRef.current = null
      setState((prev) => ({ ...prev, keepAwake: false }))
      return
    }

    try {
      wakeLockRef.current = await (navigator as any).wakeLock.request("screen")
      setState((prev) => ({ ...prev, keepAwake: true }))
      wakeLockRef.current.addEventListener("release", () => {
        setState((prev) => ({ ...prev, keepAwake: false }))
      })
    } catch (err) {
      setWarning("Unable to keep the screen awake. Check browser permissions.")
    }
  }, [])

  useEffect(() => {
    if (!state.isRunning) return
    if (tickRef.current) {
      window.clearTimeout(tickRef.current)
    }
    tickRef.current = window.setTimeout(tick, 250)
    return () => {
      if (tickRef.current) window.clearTimeout(tickRef.current)
    }
  }, [state.isRunning, tick])

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        const diff = Date.now() - visibilityRef.current
        setState((prev) => {
          if (!prev.isRunning || !prev.startedAt) return prev
          let elapsed = prev.elapsedMs + diff
          let index = prev.currentIndex
          while (index < prev.steps.length && elapsed >= prev.steps[index].durationMs) {
            elapsed -= prev.steps[index].durationMs
            index += 1
          }
          const isComplete = index >= prev.steps.length
          return {
            ...prev,
            currentIndex: isComplete ? prev.steps.length - 1 : index,
            isRunning: !isComplete,
            startedAt: Date.now(),
            elapsedMs: isComplete ? prev.steps[prev.steps.length - 1].durationMs : elapsed,
          }
        })
        if (diff > 1000) {
          setWarning("Timer resynced after backgrounding; accuracy may have drifted.")
        }
        visibilityRef.current = Date.now()
      }
    }
    document.addEventListener("visibilitychange", handleVisibility)
    return () => document.removeEventListener("visibilitychange", handleVisibility)
  }, [])

  return {
    presets,
    state,
    currentStep,
    remainingMs,
    totalElapsedMs,
    warning,
    setWarning,
    start,
    pause,
    reset,
    advanceStep,
    selectPreset,
    toggleMute,
    toggleWakeLock,
    updatePreset,
    addPreset,
    deletePreset,
    setPresets,
  }
}
