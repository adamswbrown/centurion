"use client"

import { useState } from "react"
import { format } from "date-fns"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  useClientNotes,
  useCurrentWeekNumber,
  useCreateCoachNote,
  useUpdateCoachNote,
  useDeleteCoachNote,
} from "@/hooks/useCoachNotes"
import { Plus, Edit2, Trash2, MessageSquare, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface CoachNotesSectionProps {
  clientId: number
  className?: string
}

export function CoachNotesSection({ clientId, className }: CoachNotesSectionProps) {
  const [isAddingNote, setIsAddingNote] = useState(false)
  const [newNoteText, setNewNoteText] = useState("")
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null)
  const [editNoteText, setEditNoteText] = useState("")

  const { data: notes, isLoading } = useClientNotes(clientId)
  const { data: currentWeek } = useCurrentWeekNumber(clientId)
  const createNote = useCreateCoachNote()
  const updateNote = useUpdateCoachNote()
  const deleteNote = useDeleteCoachNote()

  const handleCreateNote = async () => {
    if (!newNoteText.trim() || !currentWeek) return

    const result = await createNote.mutateAsync({
      clientId,
      weekNumber: currentWeek,
      notes: newNoteText.trim(),
    })

    if (result.success) {
      setNewNoteText("")
      setIsAddingNote(false)
    }
  }

  const handleUpdateNote = async (noteId: number) => {
    if (!editNoteText.trim()) return

    const result = await updateNote.mutateAsync({
      noteId,
      notes: editNoteText.trim(),
      clientId,
    })

    if (result.success) {
      setEditingNoteId(null)
      setEditNoteText("")
    }
  }

  const handleDeleteNote = async (noteId: number) => {
    await deleteNote.mutateAsync({ noteId, clientId })
  }

  const startEditing = (noteId: number, currentText: string) => {
    setEditingNoteId(noteId)
    setEditNoteText(currentText)
  }

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Coach Notes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Coach Notes
          </CardTitle>
          <Dialog open={isAddingNote} onOpenChange={setIsAddingNote}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-1" />
                Add Note
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Coach Note</DialogTitle>
                <p className="text-sm text-muted-foreground">
                  Week {currentWeek || "..."}
                </p>
              </DialogHeader>
              <Textarea
                placeholder="Write your note here..."
                value={newNoteText}
                onChange={(e) => setNewNoteText(e.target.value)}
                rows={5}
              />
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button
                  onClick={handleCreateNote}
                  disabled={!newNoteText.trim() || createNote.isPending}
                >
                  {createNote.isPending && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  Save Note
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        <CardDescription>
          Private notes about this client (not visible to them)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {notes && notes.length > 0 ? (
          <div className="space-y-3">
            {notes.map((note) => (
              <div
                key={note.id}
                className={cn(
                  "p-3 rounded-lg border bg-muted/50",
                  editingNoteId === note.id && "ring-2 ring-primary"
                )}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      Week {note.weekNumber}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {note.coach.name || note.coach.email}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(note.createdAt), "MMM d, yyyy")}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => startEditing(note.id, note.notes)}
                    >
                      <Edit2 className="h-3 w-3" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Note</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete this note? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteNote(note.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>

                {editingNoteId === note.id ? (
                  <div className="space-y-2">
                    <Textarea
                      value={editNoteText}
                      onChange={(e) => setEditNoteText(e.target.value)}
                      rows={3}
                    />
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleUpdateNote(note.id)}
                        disabled={updateNote.isPending}
                      >
                        {updateNote.isPending && (
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        )}
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingNoteId(null)
                          setEditNoteText("")
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm whitespace-pre-wrap">{note.notes}</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No notes yet</p>
            <p className="text-xs">Add notes to track important information about this client</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
