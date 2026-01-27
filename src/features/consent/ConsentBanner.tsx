"use client"

import { useState, useEffect } from "react"
import { hasValidConsent, acceptConsent } from "@/app/actions/consent"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"

export function ConsentBanner() {
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [terms, setTerms] = useState(false)
  const [privacy, setPrivacy] = useState(false)
  const [dataProcessing, setDataProcessing] = useState(false)
  const [marketing, setMarketing] = useState(false)

  useEffect(() => {
    async function checkConsent() {
      try {
        const result = await hasValidConsent()
        if (!result.valid) {
          setShow(true)
        }
      } catch {
        // If check fails (e.g. not authenticated), don't show banner
      }
    }

    checkConsent()
  }, [])

  if (!show) return null

  const canSubmit = terms && privacy && dataProcessing

  async function handleAccept() {
    if (!canSubmit) return

    setLoading(true)
    setError(null)

    try {
      const result = await acceptConsent({
        termsAccepted: true,
        privacyAccepted: true,
        dataProcessing: true,
        marketing,
      })

      if (result.error) {
        setError(result.error)
        setLoading(false)
        return
      }

      setShow(false)
    } catch {
      setError("Failed to save consent. Please try again.")
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
      <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle>We need your consent</CardTitle>
          <p className="text-sm text-muted-foreground">
            Please review and accept the following to continue using Centurion.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <Checkbox
                id="terms"
                checked={terms}
                onCheckedChange={(checked) => setTerms(checked === true)}
                disabled={loading}
              />
              <Label htmlFor="terms" className="text-sm leading-relaxed cursor-pointer">
                I accept the{" "}
                <Link
                  href="/legal/terms"
                  target="_blank"
                  className="text-primary underline underline-offset-4 hover:no-underline"
                >
                  Terms of Service
                </Link>{" "}
                <span className="text-destructive">*</span>
              </Label>
            </div>

            <div className="flex items-start space-x-3">
              <Checkbox
                id="privacy"
                checked={privacy}
                onCheckedChange={(checked) => setPrivacy(checked === true)}
                disabled={loading}
              />
              <Label htmlFor="privacy" className="text-sm leading-relaxed cursor-pointer">
                I accept the{" "}
                <Link
                  href="/legal/privacy"
                  target="_blank"
                  className="text-primary underline underline-offset-4 hover:no-underline"
                >
                  Privacy Policy
                </Link>{" "}
                <span className="text-destructive">*</span>
              </Label>
            </div>

            <div className="flex items-start space-x-3">
              <Checkbox
                id="dataProcessing"
                checked={dataProcessing}
                onCheckedChange={(checked) => setDataProcessing(checked === true)}
                disabled={loading}
              />
              <Label htmlFor="dataProcessing" className="text-sm leading-relaxed cursor-pointer">
                I accept the{" "}
                <Link
                  href="/legal/data-processing"
                  target="_blank"
                  className="text-primary underline underline-offset-4 hover:no-underline"
                >
                  Data Processing Agreement
                </Link>{" "}
                <span className="text-destructive">*</span>
              </Label>
            </div>

            <div className="flex items-start space-x-3">
              <Checkbox
                id="marketing"
                checked={marketing}
                onCheckedChange={(checked) => setMarketing(checked === true)}
                disabled={loading}
              />
              <Label htmlFor="marketing" className="text-sm leading-relaxed cursor-pointer">
                I agree to receive marketing communications (optional)
              </Label>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Fields marked with <span className="text-destructive">*</span> are required.
          </p>

          <Button
            onClick={handleAccept}
            className="w-full"
            disabled={!canSubmit || loading}
          >
            {loading ? "Saving..." : "Accept and continue"}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
