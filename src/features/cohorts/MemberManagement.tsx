"use client"

import { useState } from "react"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  useAddMemberToCohort,
  useRemoveMemberFromCohort,
  useUpdateMembershipStatus,
} from "@/hooks/useCohorts"
import { useMembers } from "@/hooks/useMembers"
import { MembershipStatus } from "@prisma/client"
import { X } from "lucide-react"

interface MemberManagementProps {
  cohortId: number
  memberships: Array<{
    status: MembershipStatus
    joinedAt: Date
    leftAt: Date | null
    user: {
      id: number
      name: string | null
      email: string | null
      image: string | null
    }
  }>
}

const statusColors = {
  ACTIVE: "bg-emerald-100 text-emerald-800",
  PAUSED: "bg-orange-100 text-orange-800",
  INACTIVE: "bg-gray-100 text-gray-800",
}

export function MemberManagement({
  cohortId,
  memberships,
}: MemberManagementProps) {
  const [selectedMemberId, setSelectedMemberId] = useState<string>("")
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const { data: allMembers } = useMembers()
  const addMember = useAddMemberToCohort()
  const removeMember = useRemoveMemberFromCohort()
  const updateStatus = useUpdateMembershipStatus()

  const currentMemberIds = new Set(memberships.map((m) => m.user.id))
  const availableMembers =
    allMembers?.filter((member) => !currentMemberIds.has(member.id)) || []

  const handleAddMember = () => {
    if (!selectedMemberId) return

    setError(null)
    setMessage(null)

    addMember.mutate(
      { cohortId, userId: Number(selectedMemberId) },
      {
        onSuccess: () => {
          setMessage("Member added successfully")
          setSelectedMemberId("")
          setTimeout(() => setMessage(null), 3000)
        },
        onError: (err) => {
          setError(err instanceof Error ? err.message : "Failed to add member")
        },
      },
    )
  }

  const handleRemoveMember = (userId: number) => {
    setError(null)
    setMessage(null)

    removeMember.mutate(
      { cohortId, userId },
      {
        onSuccess: () => {
          setMessage("Member removed successfully")
          setTimeout(() => setMessage(null), 3000)
        },
        onError: (err) => {
          setError(err instanceof Error ? err.message : "Failed to remove member")
        },
      },
    )
  }

  const handleStatusChange = (userId: number, status: MembershipStatus) => {
    setError(null)
    setMessage(null)

    updateStatus.mutate(
      { cohortId, userId, status },
      {
        onSuccess: () => {
          setMessage("Status updated successfully")
          setTimeout(() => setMessage(null), 3000)
        },
        onError: (err) => {
          setError(err instanceof Error ? err.message : "Failed to update status")
        },
      },
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Members</CardTitle>
          <Badge variant="secondary">{memberships.length}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}
        {message && (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
            {message}
          </div>
        )}

        {memberships.length === 0 ? (
          <p className="text-sm text-muted-foreground">No members yet</p>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {memberships.map(({ user, status, joinedAt, leftAt }) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {user.email}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={status}
                        onValueChange={(value) =>
                          handleStatusChange(user.id, value as MembershipStatus)
                        }
                        disabled={updateStatus.isPending}
                      >
                        <SelectTrigger className="w-[130px]">
                          <Badge
                            className={statusColors[status]}
                            variant="secondary"
                          >
                            {status}
                          </Badge>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ACTIVE">Active</SelectItem>
                          <SelectItem value="PAUSED">Paused</SelectItem>
                          <SelectItem value="INACTIVE">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p>{format(new Date(joinedAt), "MMM dd, yyyy")}</p>
                        {leftAt && (
                          <p className="text-muted-foreground">
                            Left: {format(new Date(leftAt), "MMM dd, yyyy")}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveMember(user.id)}
                        disabled={removeMember.isPending}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {availableMembers.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Add Member</p>
            <div className="flex gap-2">
              <Select
                value={selectedMemberId}
                onValueChange={setSelectedMemberId}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select a member" />
                </SelectTrigger>
                <SelectContent>
                  {availableMembers.map((member) => (
                    <SelectItem key={member.id} value={String(member.id)}>
                      {member.name} ({member.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={handleAddMember}
                disabled={!selectedMemberId || addMember.isPending}
              >
                {addMember.isPending ? "Adding..." : "Add"}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
