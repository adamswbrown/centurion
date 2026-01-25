"use client"

import { useRouter } from "next/navigation"
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
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MoreVertical, Trash2 } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { deleteMember } from "@/app/actions/members"

interface Member {
  id: number
  name: string | null
  email: string
  image: string | null
  createdAt: Date
  _count: {
    appointments: number
    cohortMemberships: number
  }
}

interface MembersTableProps {
  members: Member[]
}

export function MembersTable({ members }: MembersTableProps) {
  const router = useRouter()

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this member? This action cannot be undone.")) return

    const result = await deleteMember(id)
    if (result.success) {
      router.refresh()
    }
  }

  if (members.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No members yet</p>
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Joined</TableHead>
          <TableHead>Appointments</TableHead>
          <TableHead>Cohorts</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {members.map((member) => (
          <TableRow
            key={member.id}
            className="cursor-pointer hover:bg-muted/50"
            onClick={() => router.push(`/members/${member.id}`)}
          >
            <TableCell className="font-medium">{member.name}</TableCell>
            <TableCell>{member.email}</TableCell>
            <TableCell>
              {format(new Date(member.createdAt), "MMM dd, yyyy")}
            </TableCell>
            <TableCell>
              <Badge variant="outline">
                {member._count.appointments}
              </Badge>
            </TableCell>
            <TableCell>
              <Badge variant="outline">
                {member._count.cohortMemberships}
              </Badge>
            </TableCell>
            <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href={`/members/${member.id}`}>View</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleDelete(member.id)}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
