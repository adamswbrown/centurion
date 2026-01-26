"use client"

import { useState } from "react"
import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { updateAdminUser } from "@/app/actions/admin-users"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface UserDetailProps {
  user: {
    id: number
    name: string | null
    email: string
    role: string
    credits: number
    createdAt: Date
    appointments: Array<{ id: number; startTime: Date; endTime: Date }>
    cohortMemberships: Array<{ id: number; cohort: { id: number; name: string } }>
    invoices: Array<{ id: number; month: Date; totalAmount: any; paymentStatus: string }>
    bootcampAttendees: Array<{ id: number; bootcamp: { id: number; name: string } }>
  }
}

export function UserDetail({ user }: UserDetailProps) {
  const [name, setName] = useState(user.name || "")
  const [email, setEmail] = useState(user.email)
  const [role, setRole] = useState(user.role)
  const [password, setPassword] = useState("")
  const [credits, setCredits] = useState<number>(user.credits ?? 0)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    setMessage(null)
    setError(null)
    try {
      await updateAdminUser({
        id: user.id,
        name,
        email,
        role: role as "ADMIN" | "COACH" | "CLIENT",
        password: password || undefined,
        credits,
      })
      setPassword("")
      setMessage("User updated")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update user")
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{user.name || "User"}</h1>
        <p className="text-muted-foreground">{user.email}</p>
      </div>

      <div className="rounded-md border p-4 space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="ADMIN">ADMIN</option>
              <option value="COACH">COACH</option>
              <option value="CLIENT">CLIENT</option>
            </select>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label>Password (optional)</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Credits</Label>
            <Input
              type="number"
              min={0}
              value={credits}
              onChange={(e) => setCredits(Number(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label>Joined</Label>
            <div className="text-sm">
              {format(new Date(user.createdAt), "MMM dd, yyyy")}
            </div>
          </div>
          <div className="flex items-end">
            <Button onClick={handleSave}>Save Changes</Button>
          </div>
        </div>
        {message && (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 p-2 text-sm text-emerald-700">
            {message}
          </div>
        )}
        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 p-2 text-sm text-destructive">
            {error}
          </div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-md border p-4">
          <h2 className="font-semibold mb-2">Recent Appointments</h2>
          {user.appointments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No appointments</p>
          ) : (
            <ul className="text-sm space-y-1">
              {user.appointments.map((appt) => (
                <li key={appt.id}>
                  {format(new Date(appt.startTime), "MMM dd, yyyy h:mm a")}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-md border p-4">
          <h2 className="font-semibold mb-2">Cohorts</h2>
          {user.cohortMemberships.length === 0 ? (
            <p className="text-sm text-muted-foreground">No cohort memberships</p>
          ) : (
            <ul className="text-sm space-y-1">
              {user.cohortMemberships.map((membership) => (
                <li key={membership.id}>{membership.cohort.name}</li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-md border p-4 md:col-span-2">
          <h2 className="font-semibold mb-2">Invoices</h2>
          {user.invoices.length === 0 ? (
            <p className="text-sm text-muted-foreground">No invoices</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {user.invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell>{format(new Date(invoice.month), "MMM yyyy")}</TableCell>
                    <TableCell>${Number(invoice.totalAmount).toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{invoice.paymentStatus}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </div>
  )
}
