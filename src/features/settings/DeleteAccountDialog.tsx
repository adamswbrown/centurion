"use client"

import { useState } from "react"
import { signOut } from "next-auth/react"
import { deleteAccount } from "@/app/actions/gdpr"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface DeleteAccountDialogProps {
  hasPassword: boolean
}

export function DeleteAccountDialog({ hasPassword }: DeleteAccountDialogProps) {
  const [confirmation, setConfirmation] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  const isConfirmed = confirmation === "DELETE MY ACCOUNT"
  const canSubmit = isConfirmed && (!hasPassword || password.length > 0)

  async function handleDelete() {
    if (!canSubmit) return

    setLoading(true)
    setError(null)

    try {
      const result = await deleteAccount({
        confirmation: "DELETE MY ACCOUNT",
        password: hasPassword ? password : undefined,
      })

      if (result.error) {
        setError(result.error)
        setLoading(false)
        return
      }

      // Sign out and redirect to home
      await signOut({ callbackUrl: "/" })
    } catch {
      setError("An error occurred. Please try again.")
      setLoading(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive">Delete my account</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete your
            account and all associated data including entries, workouts, sleep
            records, appointments, and invoices.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-2">
          {error && (
            <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="deleteConfirmation">
              Type <span className="font-mono font-bold">DELETE MY ACCOUNT</span> to confirm
            </Label>
            <Input
              id="deleteConfirmation"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              placeholder="DELETE MY ACCOUNT"
              disabled={loading}
            />
          </div>

          {hasPassword && (
            <div className="space-y-2">
              <Label htmlFor="deletePassword">Enter your password</Label>
              <Input
                id="deletePassword"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your current password"
                disabled={loading}
              />
            </div>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel
            onClick={() => {
              setConfirmation("")
              setPassword("")
              setError(null)
            }}
          >
            Cancel
          </AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={!canSubmit || loading}
          >
            {loading ? "Deleting..." : "Permanently delete account"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
