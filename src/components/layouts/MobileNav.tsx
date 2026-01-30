"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  Calendar,
  Users,
  Dumbbell,
  CreditCard,
  Heart,
  LayoutDashboard,
  Timer,
  X,
  UserCog,
  FileText,
  Activity,
  Settings,
  BarChart,
  ClipboardList,
  Ticket,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Role } from "@prisma/client"
import { useViewMode } from "@/contexts/ViewModeContext"
import { useFeatureFlags, type FeatureFlags } from "@/contexts/FeatureFlagsContext"
import { ViewModeSwitcher } from "./ViewModeSwitcher"

interface MobileNavProps {
  userRole: Role
  isOpen: boolean
  onClose: () => void
}

type NavItem = {
  name: string
  href: string
  icon: typeof LayoutDashboard
  flag?: keyof FeatureFlags
}

const navigation: Record<Role, NavItem[]> = {
  ADMIN: [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Members", href: "/members", icon: Users },
    { name: "Users", href: "/admin/users", icon: UserCog },
    { name: "Appointments", href: "/appointments", icon: Calendar, flag: "appointmentsEnabled" },
    { name: "Sessions", href: "/sessions", icon: Dumbbell, flag: "sessionsEnabled" },
    { name: "Calendar", href: "/calendar", icon: Calendar },
    { name: "Memberships", href: "/admin/memberships", icon: Ticket, flag: "sessionsEnabled" },
    { name: "Cohorts", href: "/cohorts", icon: Heart, flag: "cohortsEnabled" },
    { name: "Billing", href: "/billing", icon: CreditCard },
    { name: "Reports", href: "/reports", icon: BarChart },
    { name: "Questionnaires", href: "/admin/questionnaires", icon: FileText },
    { name: "HealthKit", href: "/admin/healthkit", icon: Activity },
    { name: "Settings", href: "/admin/settings", icon: Settings },
    { name: "Timer", href: "/timer", icon: Timer },
  ],
  COACH: [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Members", href: "/members", icon: Users },
    { name: "Appointments", href: "/appointments", icon: Calendar, flag: "appointmentsEnabled" },
    { name: "Sessions", href: "/sessions", icon: Dumbbell, flag: "sessionsEnabled" },
    { name: "Calendar", href: "/calendar", icon: Calendar },
    { name: "Cohorts", href: "/cohorts", icon: Heart, flag: "cohortsEnabled" },
    { name: "Review Queue", href: "/coach/review-queue", icon: ClipboardList },
    { name: "Reports", href: "/reports", icon: BarChart },
    { name: "Invoices", href: "/invoices/me", icon: CreditCard },
    { name: "Timer", href: "/timer", icon: Timer },
  ],
  CLIENT: [
    { name: "Dashboard", href: "/client/dashboard", icon: LayoutDashboard },
    { name: "My Sessions", href: "/client/sessions", icon: Dumbbell, flag: "sessionsEnabled" },
    { name: "My Membership", href: "/client/membership", icon: Ticket, flag: "sessionsEnabled" },
    { name: "My Cohorts", href: "/client/cohorts", icon: Heart, flag: "cohortsEnabled" },
    { name: "Health Data", href: "/client/health", icon: Heart },
    { name: "Invoices", href: "/client/invoices", icon: CreditCard },
  ],
}

export function MobileNav({ userRole, isOpen, onClose }: MobileNavProps) {
  const pathname = usePathname()
  const { effectiveNavRole } = useViewMode()
  const flags = useFeatureFlags()
  const allItems = navigation[effectiveNavRole] || navigation.CLIENT
  const navItems = allItems.filter((item) => !item.flag || flags[item.flag])

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
        onClick={onClose}
      />

      {/* Mobile navigation panel */}
      <div className="fixed inset-y-0 left-0 z-50 w-64 bg-card border-r md:hidden">
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center justify-between px-4 border-b">
            <h1 className="text-xl font-bold">Centurion</h1>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-6 w-6" />
            </Button>
          </div>
          <div className="px-4 pt-3">
            <ViewModeSwitcher />
          </div>
          <nav className="flex-1 space-y-1 px-2 py-4 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    "group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors",
                    isActive
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <item.icon
                    className={cn(
                      "mr-3 h-5 w-5 flex-shrink-0",
                      isActive ? "text-accent-foreground" : "text-muted-foreground"
                    )}
                  />
                  {item.name}
                </Link>
              )
            })}
          </nav>
        </div>
      </div>
    </>
  )
}
