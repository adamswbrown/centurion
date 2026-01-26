"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { updateUserProfile } from "@/app/actions/settings"

interface UserSettingsFormProps {
  initialValues: {
    name: string | null
    email: string
    credits: number
    creditsExpiry: Date | null
  }
}

export function UserSettingsForm({ initialValues }: UserSettingsFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [name, setName] = useState(initialValues.name ?? "")
  const [email, setEmail] = useState(initialValues.email)
  const [password, setPassword] = useState("")

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSuccess(false)
    setLoading(true)

    try {
      await updateUserProfile({
        name: name || undefined,
        email: email || undefined,
        password: password || undefined,
      })
      setSuccess(true)
      setPassword("")
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update profile")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              aria-label="Your name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              aria-label="Your email address"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">New Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Leave blank to keep current"
              aria-describedby="password-desc"
            />
            <p id="password-desc" className="text-sm text-muted-foreground">
              Minimum 8 characters. Leave blank to keep your current password.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Credits</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Available Credits</span>
            <span className="font-semibold">{initialValues.credits}</span>
          </div>
          {initialValues.creditsExpiry && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Expires</span>
              <span className="text-sm">
                {new Date(initialValues.creditsExpiry).toLocaleDateString()}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {success && (
        <div role="status" aria-live="polite" className="text-green-600 text-sm">
          Profile updated successfully
        </div>
      )}
      {error && (
        <div role="alert" aria-live="assertive" className="text-destructive text-sm">
          {error}
        </div>
      )}

      <Button type="submit" disabled={loading} aria-busy={loading}>
        {loading ? "Saving..." : "Save Changes"}
      </Button>
    </form>
  )
}
