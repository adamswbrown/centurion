"use client"

import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { signOut } from "next-auth/react"
import type { Session } from "next-auth"

interface HeaderProps {
  session: Session
  onMobileMenuToggle: () => void
}

export function Header({ session, onMobileMenuToggle }: HeaderProps) {
  const handleSignOut = () => {
    signOut({ callbackUrl: "/login" })
  }

  return (
    <header className="sticky top-0 z-10 flex h-16 flex-shrink-0 border-b bg-background">
      <div className="flex flex-1 justify-between px-4">
        <div className="flex flex-1 items-center">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={onMobileMenuToggle}
          >
            <Menu className="h-6 w-6" />
          </Button>
          <div className="ml-4 flex items-center md:ml-6">
            <h2 className="text-lg font-semibold">
              Welcome, {session.user.name || session.user.email}
            </h2>
          </div>
        </div>
        <div className="ml-4 flex items-center md:ml-6">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                  {session.user.name?.[0]?.toUpperCase() || session.user.email?.[0]?.toUpperCase()}
                </div>
                <span className="hidden md:block">{session.user.name || session.user.email}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{session.user.name}</span>
                  <span className="text-xs text-muted-foreground">{session.user.email}</span>
                  <span className="text-xs text-muted-foreground capitalize">
                    Role: {session.user.role.toLowerCase()}
                  </span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut}>
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
