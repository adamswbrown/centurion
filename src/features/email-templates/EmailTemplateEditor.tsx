"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { updateEmailTemplate, previewEmailTemplateById } from "@/app/actions/email-templates"

interface EmailTemplateData {
  id: number
  key: string
  name: string
  description: string | null
  subjectTemplate: string
  bodyTemplate: string
  textTemplate: string
  availableTokens: string[]
  enabled: boolean
  isSystem: boolean
}

interface EmailTemplateEditorProps {
  template: EmailTemplateData
}

export function EmailTemplateEditor({ template }: EmailTemplateEditorProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [subjectTemplate, setSubjectTemplate] = useState(template.subjectTemplate)
  const [bodyTemplate, setBodyTemplate] = useState(template.bodyTemplate)
  const [textTemplate, setTextTemplate] = useState(template.textTemplate)
  const [enabled, setEnabled] = useState(template.enabled)

  // Preview state
  const [previewHtml, setPreviewHtml] = useState<string | null>(null)
  const [previewSubject, setPreviewSubject] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  function insertToken(token: string, field: "subject" | "body" | "text") {
    const insertion = `{{${token}}}`
    if (field === "subject") {
      setSubjectTemplate((prev) => prev + insertion)
    } else if (field === "body") {
      setBodyTemplate((prev) => prev + insertion)
    } else {
      setTextTemplate((prev) => prev + insertion)
    }
  }

  async function handleSave() {
    setError(null)
    setSuccess(false)
    setLoading(true)

    try {
      await updateEmailTemplate({
        id: template.id,
        subjectTemplate,
        bodyTemplate,
        textTemplate,
        enabled,
      })
      setSuccess(true)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save template")
    } finally {
      setLoading(false)
    }
  }

  async function handlePreview() {
    setPreviewLoading(true)
    try {
      // First save current edits, then preview
      await updateEmailTemplate({
        id: template.id,
        subjectTemplate,
        bodyTemplate,
        textTemplate,
        enabled,
      })
      const preview = await previewEmailTemplateById(template.id)
      setPreviewSubject(preview.subject)
      setPreviewHtml(preview.html)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate preview")
    } finally {
      setPreviewLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header info */}
      <div className="flex items-center gap-3">
        <Badge variant="outline">
          <code>{template.key}</code>
        </Badge>
        <Badge variant={template.isSystem ? "default" : "secondary"}>
          {template.isSystem ? "System" : "Custom"}
        </Badge>
        <Badge variant={enabled ? "default" : "secondary"}>
          {enabled ? "Enabled" : "Disabled"}
        </Badge>
      </div>

      {template.description && (
        <p className="text-sm text-muted-foreground">{template.description}</p>
      )}

      {/* Available tokens */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Available Tokens</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-2">
            Click a token to insert it at the end of the active field.
          </p>
          <div className="flex flex-wrap gap-2">
            {template.availableTokens.map((token) => (
              <button
                key={token}
                type="button"
                onClick={() => insertToken(token, "body")}
                className="inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold cursor-pointer hover:bg-muted transition-colors"
              >
                {`{{${token}}}`}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="edit">
        <TabsList>
          <TabsTrigger value="edit">Edit</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>

        <TabsContent value="edit" className="space-y-4">
          {/* Enable/Disable */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="enabled"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="h-4 w-4"
            />
            <Label htmlFor="enabled">Template Enabled</Label>
          </div>

          {/* Subject */}
          <div className="space-y-2">
            <Label htmlFor="subjectTemplate">Subject Line</Label>
            <Input
              id="subjectTemplate"
              value={subjectTemplate}
              onChange={(e) => setSubjectTemplate(e.target.value)}
              placeholder="Email subject with {{tokens}}"
            />
          </div>

          {/* HTML Body */}
          <div className="space-y-2">
            <Label htmlFor="bodyTemplate">HTML Body</Label>
            <Textarea
              id="bodyTemplate"
              value={bodyTemplate}
              onChange={(e) => setBodyTemplate(e.target.value)}
              rows={15}
              className="font-mono text-sm"
              placeholder="HTML email body with {{tokens}}"
            />
          </div>

          {/* Plain Text */}
          <div className="space-y-2">
            <Label htmlFor="textTemplate">Plain Text Version</Label>
            <Textarea
              id="textTemplate"
              value={textTemplate}
              onChange={(e) => setTextTemplate(e.target.value)}
              rows={5}
              className="font-mono text-sm"
              placeholder="Plain text fallback with {{tokens}}"
            />
          </div>
        </TabsContent>

        <TabsContent value="preview" className="space-y-4">
          <Button
            onClick={handlePreview}
            disabled={previewLoading}
            variant="outline"
          >
            {previewLoading ? "Generating..." : "Generate Preview"}
          </Button>

          {previewSubject && (
            <div className="space-y-2">
              <Label>Subject</Label>
              <div className="p-3 border rounded-md bg-muted text-sm">
                {previewSubject}
              </div>
            </div>
          )}

          {previewHtml && (
            <div className="space-y-2">
              <Label>HTML Body</Label>
              <div
                className="p-4 border rounded-md bg-white"
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Save/Status */}
      {success && (
        <div role="status" aria-live="polite" className="text-green-600 text-sm">
          Template saved successfully
        </div>
      )}
      {error && (
        <div role="alert" aria-live="assertive" className="text-destructive text-sm">
          {error}
        </div>
      )}

      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={loading}>
          {loading ? "Saving..." : "Save Template"}
        </Button>
        <Button variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </div>
  )
}
