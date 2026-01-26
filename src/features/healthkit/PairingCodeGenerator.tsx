"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Copy, RefreshCw, Check } from "lucide-react"

interface PairingCodeGeneratorProps {
  clientId: number
  clientName: string | null
  onGenerate: (clientId: number) => Promise<{ code: string; expiresAt: Date }>
  onRegenerate: (clientId: number) => Promise<{ code: string; expiresAt: Date }>
}

export function PairingCodeGenerator({
  clientId,
  clientName,
  onGenerate,
  onRegenerate,
}: PairingCodeGeneratorProps) {
  const [code, setCode] = useState<string | null>(null)
  const [expiresAt, setExpiresAt] = useState<Date | null>(null)
  const [generating, setGenerating] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleGenerate = async (regenerate = false) => {
    setGenerating(true)
    setError(null)
    setCopied(false)

    try {
      const result = regenerate
        ? await onRegenerate(clientId)
        : await onGenerate(clientId)
      setCode(result.code)
      setExpiresAt(new Date(result.expiresAt))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate code")
    } finally {
      setGenerating(false)
    }
  }

  const handleCopy = async () => {
    if (!code) return
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement("textarea")
      textArea.value = code
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand("copy")
      document.body.removeChild(textArea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const formatExpiry = (date: Date) => {
    const hours = Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60))
    if (hours <= 0) return "Expired"
    if (hours === 1) return "Expires in 1 hour"
    return `Expires in ${hours} hours`
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">iOS App Pairing</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <p className="text-sm text-muted-foreground">
          Generate a pairing code for {clientName || "this client"} to connect their iOS app
          and sync HealthKit data.
        </p>

        {code ? (
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-4 rounded-lg border bg-muted/50 p-6">
              <span className="font-mono text-4xl font-bold tracking-widest">
                {code}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopy}
                className="shrink-0"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-emerald-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>

            {expiresAt && (
              <div className="flex items-center justify-center">
                <Badge
                  variant={
                    expiresAt.getTime() > Date.now() ? "secondary" : "destructive"
                  }
                >
                  {formatExpiry(expiresAt)}
                </Badge>
              </div>
            )}

            <div className="flex justify-center gap-2">
              <Button
                variant="outline"
                onClick={() => handleGenerate(true)}
                disabled={generating}
              >
                <RefreshCw
                  className={`mr-2 h-4 w-4 ${generating ? "animate-spin" : ""}`}
                />
                Generate New Code
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <Button onClick={() => handleGenerate(false)} disabled={generating}>
              {generating ? "Generating..." : "Generate Pairing Code"}
            </Button>
          </div>
        )}

        <p className="text-xs text-muted-foreground text-center">
          The client should enter this code in the iOS app to connect their account.
          Codes expire after 24 hours.
        </p>
      </CardContent>
    </Card>
  )
}
