import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { deleteAdminUser } from "@/app/actions/admin-users"

export function DeleteUserButton({ userId, onDeleted }: { userId: number; onDeleted?: () => void }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    setLoading(true)
    setError(null)
    try {
      await deleteAdminUser(userId)
      setOpen(false)
      if (onDeleted) onDeleted()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete user")
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button variant="destructive" onClick={() => setOpen(true)} size="sm" aria-label="Delete user">
        Delete
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this user? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 mt-4">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={loading} aria-busy={loading}>
              {loading ? "Deleting..." : "Confirm Delete"}
            </Button>
          </div>
          {error && <div role="alert" aria-live="assertive" className="text-destructive text-sm mt-2">{error}</div>}
        </DialogContent>
      </Dialog>
    </>
  )
}
