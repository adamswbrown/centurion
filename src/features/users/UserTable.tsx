"use client"


import Link from "next/link"
import { useState } from "react"
import { format } from "date-fns"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { DeleteUserButton } from "./DeleteUserButton"
import { bulkAdminUserAction } from "@/app/actions/admin-users"
import { Button } from "@/components/ui/button"

interface UserTableProps {
  users: Array<{
    id: number
    name: string | null
    email: string
    role: string
    createdAt: Date
    credits: number
    _count: {
      appointments: number
      cohortMemberships: number
      invoices: number
    }
  }>
}

export function UserTable({ users }: UserTableProps) {
  const [selected, setSelected] = useState<number[]>([])
  const [bulkAction, setBulkAction] = useState<"" | "delete" | "role">("")
  const [bulkRole, setBulkRole] = useState<string>("COACH")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (users.length === 0) {
    return <div className="text-sm text-muted-foreground">No users found.</div>
  }

  const allSelected = selected.length === users.length

  async function handleBulkDelete() {
    setLoading(true)
    setError(null)
    try {
      await bulkAdminUserAction({ ids: selected, action: "delete" })
      setSelected([])
      setBulkAction("")
      window.location.reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bulk delete failed")
    } finally {
      setLoading(false)
    }
  }

  async function handleBulkRoleChange() {
    setLoading(true)
    setError(null)
    try {
      await bulkAdminUserAction({ ids: selected, action: "role", value: bulkRole })
      setSelected([])
      setBulkAction("")
      window.location.reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bulk role update failed")
    } finally {
      setLoading(false)
    }
  }

  function toggleSelect(id: number) {
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
  }

  function toggleSelectAll() {
    if (allSelected) {
      setSelected([])
    } else {
      setSelected(users.map((u) => u.id))
    }
  }

  return (
    <div>
      {selected.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2 items-center bg-muted/40 p-2 rounded-md border">
          <span>{selected.length} selected</span>
          <Button size="sm" variant="destructive" onClick={() => setBulkAction("delete")} disabled={loading}>Delete</Button>
          <Button size="sm" variant="outline" onClick={() => setBulkAction("role")} disabled={loading}>Change Role</Button>
          {bulkAction === "role" && (
            <>
              <select className="ml-2 rounded border px-2 py-1 text-sm" aria-label="Select role for bulk update" value={bulkRole} onChange={e => setBulkRole(e.target.value)}>
                <option value="ADMIN">ADMIN</option>
                <option value="COACH">COACH</option>
                <option value="CLIENT">CLIENT</option>
              </select>
              <Button size="sm" onClick={handleBulkRoleChange} disabled={loading}>Apply</Button>
            </>
          )}
          {bulkAction === "delete" && (
            <Button size="sm" variant="destructive" onClick={handleBulkDelete} disabled={loading}>Confirm Delete</Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => setBulkAction("")}>Cancel</Button>
          {error && <span role="alert" aria-live="assertive" className="text-destructive text-sm ml-2">{error}</span>}
        </div>
      )}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <input type="checkbox" aria-label="Select all users" checked={allSelected} onChange={toggleSelectAll} />
            </TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Joined</TableHead>
            <TableHead>Appointments</TableHead>
            <TableHead>Cohorts</TableHead>
            <TableHead>Credits</TableHead>
            <TableHead>Invoices</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell>
                <input
                  type="checkbox"
                  aria-label={`Select ${user.email}`}
                  checked={selected.includes(user.id)}
                  onChange={() => toggleSelect(user.id)}
                />
              </TableCell>
              <TableCell className="font-medium">
                <Link href={`/admin/users/${user.id}`} className="hover:underline">
                  {user.name || "(No name)"}
                </Link>
              </TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>
                <Badge variant="outline">{user.role}</Badge>
              </TableCell>
              <TableCell>{format(new Date(user.createdAt), "MMM dd, yyyy")}</TableCell>
              <TableCell>{user._count.appointments}</TableCell>
              <TableCell>{user._count.cohortMemberships}</TableCell>
              <TableCell>{user.credits}</TableCell>
              <TableCell>{user._count.invoices}</TableCell>
              <TableCell>
                <DeleteUserButton userId={user.id} onDeleted={() => window.location.reload()} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
