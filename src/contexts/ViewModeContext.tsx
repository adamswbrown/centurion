"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import type { Role } from "@prisma/client"

type ViewMode = "admin" | "coach"

interface ViewModeContextValue {
  viewMode: ViewMode
  setViewMode: (mode: ViewMode) => void
  canSwitch: boolean
  effectiveNavRole: Role
}

const ViewModeContext = createContext<ViewModeContextValue | null>(null)

const STORAGE_KEY = "centurion-view-mode"

interface ViewModeProviderProps {
  userRole: Role
  children: ReactNode
}

export function ViewModeProvider({ userRole, children }: ViewModeProviderProps) {
  const canSwitch = userRole === "ADMIN"

  const [viewMode, setViewModeState] = useState<ViewMode>(() => {
    if (!canSwitch) return userRole === "COACH" ? "coach" : "admin"
    if (typeof window === "undefined") return "admin"
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === "admin" || stored === "coach") return stored
    return "admin"
  })

  const setViewMode = (mode: ViewMode) => {
    if (!canSwitch) return
    setViewModeState(mode)
    localStorage.setItem(STORAGE_KEY, mode)
  }

  // Sync from localStorage on mount (handles SSR hydration)
  useEffect(() => {
    if (!canSwitch) return
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === "admin" || stored === "coach") {
      setViewModeState(stored)
    }
  }, [canSwitch])

  const effectiveNavRole: Role = canSwitch
    ? (viewMode === "admin" ? "ADMIN" : "COACH")
    : userRole

  return (
    <ViewModeContext.Provider value={{ viewMode, setViewMode, canSwitch, effectiveNavRole }}>
      {children}
    </ViewModeContext.Provider>
  )
}

export function useViewMode() {
  const context = useContext(ViewModeContext)
  if (!context) {
    throw new Error("useViewMode must be used within a ViewModeProvider")
  }
  return context
}
