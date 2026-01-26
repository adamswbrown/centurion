"use client"

import Link from "next/link"
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
  if (users.length === 0) {
    return <div className="text-sm text-muted-foreground">No users found.</div>
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Joined</TableHead>
          <TableHead>Appointments</TableHead>
          <TableHead>Cohorts</TableHead>
          <TableHead>Credits</TableHead>
          <TableHead>Invoices</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user) => (
          <TableRow key={user.id}>
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
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
