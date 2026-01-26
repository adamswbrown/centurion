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
} from "lucide-react"
import type { Role } from "@prisma/client"

interface SidebarProps {
  userRole: Role
}

const navigation = {
  ADMIN: [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Members", href: "/members", icon: Users },
    { name: "Appointments", href: "/appointments", icon: Calendar },
    { name: "Calendar", href: "/calendar", icon: Calendar },
    { name: "Bootcamps", href: "/bootcamps", icon: Dumbbell },
    { name: "Cohorts", href: "/cohorts", icon: Heart },
    { name: "Billing", href: "/billing", icon: CreditCard },
    { name: "Timer", href: "/timer", icon: Timer },
  ],
  COACH: [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Members", href: "/members", icon: Users },
    { name: "Appointments", href: "/appointments", icon: Calendar },
    { name: "Calendar", href: "/calendar", icon: Calendar },
    { name: "Bootcamps", href: "/bootcamps", icon: Dumbbell },
    { name: "Cohorts", href: "/cohorts", icon: Heart },
    { name: "Invoices", href: "/invoices/me", icon: CreditCard },
    { name: "Timer", href: "/timer", icon: Timer },
  ],
  CLIENT: [
    { name: "Dashboard", href: "/client/dashboard", icon: LayoutDashboard },
    { name: "My Appointments", href: "/client/appointments", icon: Calendar },
    { name: "My Bootcamps", href: "/client/bootcamps", icon: Dumbbell },
    { name: "My Cohorts", href: "/client/cohorts", icon: Heart },
    { name: "Health Data", href: "/client/health", icon: Heart },
    { name: "Invoices", href: "/client/invoices", icon: CreditCard },
  ],
}

export function Sidebar({ userRole }: SidebarProps) {
  const pathname = usePathname()
  const navItems = navigation[userRole] || navigation.CLIENT

  return (
    <div className="hidden md:fixed md:inset-y-0 md:flex md:w-64 md:flex-col">
      <div className="flex min-h-0 flex-1 flex-col border-r bg-card">
        <div className="flex flex-1 flex-col overflow-y-auto pt-5 pb-4">
          <div className="flex flex-shrink-0 items-center px-4">
            <h1 className="text-xl font-bold">Centurion</h1>
          </div>
          <nav className="mt-8 flex-1 space-y-1 px-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
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
    </div>
  )
}
