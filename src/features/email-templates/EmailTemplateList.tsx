"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { toggleEmailTemplate, deleteEmailTemplate } from "@/app/actions/email-templates"
import { format } from "date-fns"

interface EmailTemplate {
  id: number
  key: string
  name: string
  description: string | null
  enabled: boolean
  isSystem: boolean
  updatedAt: Date
}

interface EmailTemplateListProps {
  templates: EmailTemplate[]
}

export function EmailTemplateList({ templates }: EmailTemplateListProps) {
  const router = useRouter()
  const [loading, setLoading] = useState<number | null>(null)

  async function handleToggle(id: number, enabled: boolean) {
    setLoading(id)
    try {
      await toggleEmailTemplate(id, !enabled)
      router.refresh()
    } catch (err) {
      console.error("Failed to toggle template:", err)
    } finally {
      setLoading(null)
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Are you sure you want to delete this template?")) return

    setLoading(id)
    try {
      await deleteEmailTemplate(id)
      router.refresh()
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete template")
    } finally {
      setLoading(null)
    }
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Key</TableHead>
          <TableHead>Enabled</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Last Updated</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {templates.map((template) => (
          <TableRow key={template.id}>
            <TableCell className="font-medium">{template.name}</TableCell>
            <TableCell>
              <code className="text-sm bg-muted px-1.5 py-0.5 rounded">
                {template.key}
              </code>
            </TableCell>
            <TableCell>
              <button
                type="button"
                onClick={() => handleToggle(template.id, template.enabled)}
                disabled={loading === template.id}
                className="cursor-pointer"
                aria-label={template.enabled ? "Disable template" : "Enable template"}
              >
                <Badge variant={template.enabled ? "default" : "secondary"}>
                  {template.enabled ? "Enabled" : "Disabled"}
                </Badge>
              </button>
            </TableCell>
            <TableCell>
              <Badge variant={template.isSystem ? "outline" : "secondary"}>
                {template.isSystem ? "System" : "Custom"}
              </Badge>
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {format(new Date(template.updatedAt), "MMM dd, yyyy")}
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <Link href={`/admin/email-templates/${template.id}`}>
                  <Button variant="outline" size="sm">
                    Edit
                  </Button>
                </Link>
                {!template.isSystem && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(template.id)}
                    disabled={loading === template.id}
                  >
                    Delete
                  </Button>
                )}
              </div>
            </TableCell>
          </TableRow>
        ))}
        {templates.length === 0 && (
          <TableRow>
            <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
              No email templates found. Seed the database to get started.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  )
}
