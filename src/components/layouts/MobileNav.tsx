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
} from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Role } from "@prisma/client"

interface MobileNavProps {
  userRole: Role
  isOpen: boolean
  onClose: () => void
}

const navigation = {
  ADMIN: [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Members", href: "/members", icon: Users },
    { name: "Users", href: "/admin/users", icon: UserCog },
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

export function MobileNav({ userRole, isOpen, onClose }: MobileNavProps) {
  const pathname = usePathname()
  const navItems = navigation[userRole] || navigation.CLIENT

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
