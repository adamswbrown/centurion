"use client"

import { useState } from "react"
import { FileText, Plus } from "lucide-react"
import { format } from "date-fns"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { useGenerateInvoice } from "@/hooks/useInvoices"
import { useMembers } from "@/hooks/useMembers"

export function GenerateInvoiceDialog() {
  const [open, setOpen] = useState(false)
  const [userId, setUserId] = useState<string>("")
  const [month, setMonth] = useState(
    format(new Date(), "yyyy-MM")
  )
  const [error, setError] = useState("")

  const generateInvoice = useGenerateInvoice()
  const { data: members, isLoading: membersLoading } = useMembers()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")

    if (!userId) {
      setError("Please select a member")
      return
    }

    try {
      await generateInvoice.mutateAsync({
        userId: parseInt(userId),
        month,
      })

      setOpen(false)
      setUserId("")
      setMonth(format(new Date(), "yyyy-MM"))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate invoice")
    }
  }

  function handleOpenChange(newOpen: boolean) {
    setOpen(newOpen)
    if (!newOpen) {
      setError("")
      setUserId("")
      setMonth(format(new Date(), "yyyy-MM"))
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Generate Invoice
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generate Invoice</DialogTitle>
          <DialogDescription>
            Create an invoice from attended appointments for a member
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="userId">Member</Label>
            <Select value={userId} onValueChange={setUserId}>
              <SelectTrigger id="userId">
                <SelectValue placeholder="Select a member" />
              </SelectTrigger>
              <SelectContent>
                {membersLoading ? (
                  <SelectItem value="" disabled>
                    Loading members...
                  </SelectItem>
                ) : members && members.length > 0 ? (
                  members.map((member) => (
                    <SelectItem key={member.id} value={String(member.id)}>
                      {member.name || member.email}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="" disabled>
                    No members found
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="month">Month</Label>
            <Input
              id="month"
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              required
            />
          </div>

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={generateInvoice.isPending || !userId}
            >
              {generateInvoice.isPending ? (
                <>
                  <FileText className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  Generate
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
