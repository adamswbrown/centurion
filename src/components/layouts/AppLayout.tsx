"use client"

import { useState } from "react"
import { Sidebar } from "./Sidebar"
import { Header } from "./Header"
import { MobileNav } from "./MobileNav"
import type { Session } from "next-auth"

interface AppLayoutProps {
  session: Session
  children: React.ReactNode
}

export function AppLayout({ session, children }: AppLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
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
        <main className="flex-1 overflow-y-auto bg-muted/50 p-4">
          {children}
        </main>
      </div>
    </div>
  )
}
