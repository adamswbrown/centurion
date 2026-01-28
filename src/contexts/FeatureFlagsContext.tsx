"use client"

import { createContext, useContext, type ReactNode } from "react"

export interface FeatureFlags {
  appointmentsEnabled: boolean
  sessionsEnabled: boolean
  cohortsEnabled: boolean
}

const defaultFlags: FeatureFlags = {
  appointmentsEnabled: false,
  sessionsEnabled: true,
  cohortsEnabled: true,
}

const FeatureFlagsContext = createContext<FeatureFlags>(defaultFlags)

interface FeatureFlagsProviderProps {
  flags: FeatureFlags
  children: ReactNode
}

export function FeatureFlagsProvider({ flags, children }: FeatureFlagsProviderProps) {
  return (
    <FeatureFlagsContext.Provider value={flags}>
      {children}
    </FeatureFlagsContext.Provider>
  )
}

export function useFeatureFlags() {
  return useContext(FeatureFlagsContext)
}
