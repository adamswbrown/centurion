"use client"

import { Shield, Users, User } from "lucide-react"
import { useViewMode } from "@/contexts/ViewModeContext"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export function ViewModeSwitcher() {
  const { viewMode, setViewMode, canSwitch } = useViewMode()

  if (!canSwitch) return null

  return (
    <Select value={viewMode} onValueChange={(v) => setViewMode(v as "admin" | "coach" | "client")}>
      <SelectTrigger className="w-full h-8 text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="admin">
          <span className="flex items-center gap-2">
            <Shield className="h-3.5 w-3.5" />
            Admin View
          </span>
        </SelectItem>
        <SelectItem value="coach">
          <span className="flex items-center gap-2">
            <Users className="h-3.5 w-3.5" />
            Coach View
          </span>
        </SelectItem>
        <SelectItem value="client">
          <span className="flex items-center gap-2">
            <User className="h-3.5 w-3.5" />
            Client View
          </span>
        </SelectItem>
      </SelectContent>
    </Select>
  )
}
