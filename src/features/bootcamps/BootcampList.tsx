"use client"

import { format } from "date-fns"
import Link from "next/link"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"
import { useDeleteBootcamp } from "@/hooks/useBootcamps"

interface BootcampListProps {
  bootcamps: Array<{
    id: number
    name: string
    startTime: Date
    endTime: Date
    capacity: number | null
    attendees: Array<{ id: number }>
  }>
}

export function BootcampList({ bootcamps }: BootcampListProps) {
  const deleteBootcamp = useDeleteBootcamp()

  if (bootcamps.length === 0) {
    return <p className="text-sm text-muted-foreground">No bootcamps yet</p>
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Time</TableHead>
          <TableHead>Capacity</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {bootcamps.map((bootcamp) => (
          <TableRow key={bootcamp.id}>
            <TableCell className="font-medium">
              <Link href={`/bootcamps/${bootcamp.id}`} className="hover:underline">
                {bootcamp.name}
              </Link>
            </TableCell>
            <TableCell>
              {format(new Date(bootcamp.startTime), "MMM dd, yyyy")}
            </TableCell>
            <TableCell>
              {format(new Date(bootcamp.startTime), "hh:mm a")} - {" "}
              {format(new Date(bootcamp.endTime), "hh:mm a")}
            </TableCell>
            <TableCell>
              <Badge variant="outline">
                {bootcamp.attendees.length}
                {bootcamp.capacity ? ` / ${bootcamp.capacity}` : ""}
              </Badge>
            </TableCell>
            <TableCell className="text-right">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => deleteBootcamp.mutate(bootcamp.id)}
                aria-label="Delete bootcamp"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
