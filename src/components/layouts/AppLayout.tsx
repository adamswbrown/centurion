"use client"

import { useState, useEffect } from "react"
import { Sidebar } from "./Sidebar"
import { Header } from "./Header"
import { MobileNav } from "./MobileNav"
import type { Session } from "next-auth"
import { ToastProvider } from "@/components/providers/ToastProvider"
import { ViewModeProvider } from "@/contexts/ViewModeContext"
import { FeatureFlagsProvider, type FeatureFlags } from "@/contexts/FeatureFlagsContext"
import { ConsentBanner } from "@/features/consent/ConsentBanner"
import { getFeatureFlags } from "@/app/actions/settings"

const DEFAULT_FLAGS: FeatureFlags = {
  appointmentsEnabled: false,
  sessionsEnabled: true,
  cohortsEnabled: true,
}

interface AppLayoutProps {
  session: Session
  featureFlags?: FeatureFlags
  children: React.ReactNode
}

export function AppLayout({ session, featureFlags, children }: AppLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [flags, setFlags] = useState<FeatureFlags>(featureFlags ?? DEFAULT_FLAGS)

  useEffect(() => {
    if (!featureFlags) {
      getFeatureFlags()
        .then(setFlags)
        .catch(() => {})
    }
  }, [featureFlags])

  return (
    <FeatureFlagsProvider flags={flags}>
      <ViewModeProvider userRole={session.user.role}>
        <ConsentBanner />
        <div className="flex h-screen overflow-hidden">
          <Sidebar userRole={session.user.role} />
          <MobileNav
            userRole={session.user.role}
            isOpen={mobileMenuOpen}
            onClose={() => setMobileMenuOpen(false)}
          />
          <div className="flex flex-1 flex-col overflow-hidden md:pl-64">
            <Header
              session={session}
              onMobileMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
            />
            <ToastProvider>
              <main className="flex-1 overflow-y-auto bg-muted/50 p-4">
                {children}
              </main>
            </ToastProvider>
          </div>
        </div>
      </ViewModeProvider>
    </FeatureFlagsProvider>
  )
}
