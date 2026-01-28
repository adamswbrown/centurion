"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { updateAdminUser } from "@/app/actions/admin-users"
import { getCreditsHistory } from "@/app/actions/credits"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { CreditAllocationForm, CreditBalanceWidget, CreditHistoryTable } from "@/features/credits"
import { UserCheckInFrequency } from "./UserCheckInFrequency"

interface UserDetailProps {
  user: {
    id: number
    name: string | null
    email: string
    role: string
    credits: number
    checkInFrequencyDays: number | null
    createdAt: Date
    appointmentsAsClient: Array<{
      id: number
      title: string | null
      startTime: Date
      endTime: Date
      status: string
      notes: string | null
      fee: any
      coach: { id: number; name: string | null }
    }>
    cohortMemberships: Array<{ id: number; cohort: { id: number; name: string } }>
    invoices: Array<{ id: number; month: Date; totalAmount: any; paymentStatus: string }>
    sessionRegistrations: Array<{ id: number; session: { id: number; title: string; classType: { name: string } | null } }>
    entries: Array<{
      id: number
      date: Date
      weight: number | null
      steps: number | null
      calories: number | null
      sleepQuality: number | null
      perceivedStress: number | null
      notes: string | null
    }>
  }
}

interface CreditTransaction {
  id: number
  amount: number
  reason: string
  createdAt: Date
  expiresAt: Date | null
  createdBy: {
    name: string | null
    email: string
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
  const [creditHistory, setCreditHistory] = useState<CreditTransaction[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  // Load credit history on mount
  useEffect(() => {
    async function loadHistory() {
      setLoadingHistory(true)
      try {
        const history = await getCreditsHistory(user.id)
        setCreditHistory(history)
      } catch (err) {
        console.error("Failed to load credit history:", err)
      } finally {
        setLoadingHistory(false)
      }
    }
    loadHistory()
  }, [user.id])

  function handleCreditUpdate(newBalance: number) {
    setCredits(newBalance)
    // Refresh credit history
    getCreditsHistory(user.id).then(setCreditHistory).catch(console.error)
  }

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

      {/* Credit Management Section */}
      <div className="space-y-4">
        <CreditAllocationForm
          userId={user.id}
          currentBalance={credits}
          onSuccess={handleCreditUpdate}
        />

        <div className="rounded-md border p-4">
          <h3 className="font-semibold mb-4">Credit History</h3>
          {loadingHistory ? (
            <div className="text-center py-4 text-muted-foreground">Loading...</div>
          ) : (
            <CreditHistoryTable transactions={creditHistory} />
          )}
        </div>
      </div>

      {/* Check-in Frequency Override */}
      <UserCheckInFrequency
        userId={user.id}
        currentFrequency={user.checkInFrequencyDays}
      />

      {/* Appointments */}
      <div className="rounded-md border p-4">
        <h2 className="font-semibold mb-3">Appointments ({user.appointmentsAsClient.length})</h2>
        {user.appointmentsAsClient.length === 0 ? (
          <p className="text-sm text-muted-foreground">No appointments</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Coach</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Fee</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {user.appointmentsAsClient.map((appt) => {
                const isPast = new Date(appt.endTime) < new Date()
                const statusLabel = appt.status === "ATTENDED"
                  ? "Attended"
                  : isPast
                    ? "Not Attended"
                    : "Scheduled"
                const statusVariant = appt.status === "ATTENDED"
                  ? "default"
                  : isPast
                    ? "secondary"
                    : "outline"
                return (
                  <TableRow key={appt.id}>
                    <TableCell>{format(new Date(appt.startTime), "MMM dd, yyyy")}</TableCell>
                    <TableCell>
                      {format(new Date(appt.startTime), "h:mm a")} – {format(new Date(appt.endTime), "h:mm a")}
                    </TableCell>
                    <TableCell>{appt.title || "—"}</TableCell>
                    <TableCell>{appt.coach?.name || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant as "default" | "destructive" | "secondary" | "outline"}>
                        {statusLabel}
                      </Badge>
                    </TableCell>
                    <TableCell>${Number(appt.fee || 0).toFixed(2)}</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Check-In History */}
      <div className="rounded-md border p-4">
        <h2 className="font-semibold mb-3">Check-In History ({user.entries?.length || 0})</h2>
        {!user.entries || user.entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">No check-in data</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Weight</TableHead>
                <TableHead>Steps</TableHead>
                <TableHead>Calories</TableHead>
                <TableHead>Sleep</TableHead>
                <TableHead>Stress</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {user.entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>{format(new Date(entry.date), "MMM dd, yyyy")}</TableCell>
                  <TableCell>{entry.weight != null ? `${entry.weight} lbs` : "—"}</TableCell>
                  <TableCell>{entry.steps != null ? entry.steps.toLocaleString() : "—"}</TableCell>
                  <TableCell>{entry.calories != null ? entry.calories.toLocaleString() : "—"}</TableCell>
                  <TableCell>{entry.sleepQuality != null ? `${entry.sleepQuality}/10` : "—"}</TableCell>
                  <TableCell>{entry.perceivedStress != null ? `${entry.perceivedStress}/10` : "—"}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{entry.notes || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
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

        <div className="rounded-md border p-4">
          <h2 className="font-semibold mb-2">Sessions</h2>
          {user.sessionRegistrations.length === 0 ? (
            <p className="text-sm text-muted-foreground">No sessions</p>
          ) : (
            <ul className="text-sm space-y-1">
              {user.sessionRegistrations.map((reg) => (
                <li key={reg.id}>{reg.session.title}{reg.session.classType ? ` (${reg.session.classType.name})` : ""}</li>
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
