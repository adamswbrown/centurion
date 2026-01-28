"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { updateSystemSettings } from "@/app/actions/settings"

interface SystemSettingsFormProps {
  initialSettings: Record<string, unknown>
}

function SettingNumber({
  id,
  label,
  description,
  value,
  onChange,
  min,
  max,
  step,
}: {
  id: string
  label: string
  description?: string
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  step?: number
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
    </div>
  )
}

function SettingCheckbox({
  id,
  label,
  description,
  checked,
  onChange,
}: {
  id: string
  label: string
  description?: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id={id}
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="h-4 w-4"
          aria-label={label}
        />
        <Label htmlFor={id}>{label}</Label>
      </div>
      {description && (
        <p className="text-sm text-muted-foreground ml-6">{description}</p>
      )}
    </div>
  )
}

function SettingText({
  id,
  label,
  description,
  value,
  onChange,
}: {
  id: string
  label: string
  description?: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
    </div>
  )
}

function SettingTextarea({
  id,
  label,
  description,
  value,
  onChange,
  rows = 10,
}: {
  id: string
  label: string
  description?: string
  value: string
  onChange: (v: string) => void
  rows?: number
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-mono"
      />
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
    </div>
  )
}

function SaveButton({
  loading,
  onSave,
  success,
  error,
}: {
  loading: boolean
  onSave: () => void
  success: boolean
  error: string | null
}) {
  return (
    <div className="space-y-2 pt-4">
      {success && (
        <div role="status" aria-live="polite" className="text-green-600 text-sm">
          Settings saved successfully
        </div>
      )}
      {error && (
        <div role="alert" aria-live="assertive" className="text-destructive text-sm">
          {error}
        </div>
      )}
      <Button type="button" onClick={onSave} disabled={loading} aria-busy={loading}>
        {loading ? "Saving..." : "Save Settings"}
      </Button>
    </div>
  )
}

export function SystemSettingsForm({ initialSettings }: SystemSettingsFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Helper to get a setting with fallback
  const s = <T,>(key: string, fallback: T): T =>
    (initialSettings[key] as T) ?? fallback

  // Coach Management
  const [maxClientsPerCoach, setMaxClientsPerCoach] = useState(s<number>("maxClientsPerCoach", 50))
  const [minClientsPerCoach, setMinClientsPerCoach] = useState(s<number>("minClientsPerCoach", 10))

  // Feature Flags
  const [healthkitEnabled, setHealthkitEnabled] = useState(s<boolean>("healthkitEnabled", true))
  const [iosIntegrationEnabled, setIosIntegrationEnabled] = useState(s<boolean>("iosIntegrationEnabled", true))
  const [showPersonalizedPlan, setShowPersonalizedPlan] = useState(s<boolean>("showPersonalizedPlan", true))
  const [appointmentsEnabled, setAppointmentsEnabled] = useState(s<boolean>("appointmentsEnabled", false))
  const [sessionsEnabled, setSessionsEnabled] = useState(s<boolean>("sessionsEnabled", true))
  const [cohortsEnabled, setCohortsEnabled] = useState(s<boolean>("cohortsEnabled", true))

  // Nutrition
  const [defaultProteinPercent, setDefaultProteinPercent] = useState(s<number>("defaultProteinPercent", 30))
  const [defaultCarbsPercent, setDefaultCarbsPercent] = useState(s<number>("defaultCarbsPercent", 40))
  const [defaultFatPercent, setDefaultFatPercent] = useState(s<number>("defaultFatPercent", 30))
  const [minDailyCalories, setMinDailyCalories] = useState(s<number>("minDailyCalories", 1000))
  const [maxDailyCalories, setMaxDailyCalories] = useState(s<number>("maxDailyCalories", 5000))
  const [minProteinPerLb, setMinProteinPerLb] = useState(s<number>("minProteinPerLb", 0.4))
  const [maxProteinPerLb, setMaxProteinPerLb] = useState(s<number>("maxProteinPerLb", 2.0))

  // Step categories
  const [stepsNotMuch, setStepsNotMuch] = useState(s<number>("stepsNotMuch", 5000))
  const [stepsLight, setStepsLight] = useState(s<number>("stepsLight", 7500))
  const [stepsModerate, setStepsModerate] = useState(s<number>("stepsModerate", 10000))
  const [stepsHeavy, setStepsHeavy] = useState(s<number>("stepsHeavy", 12500))

  // Workout categories
  const [workoutNotMuch, setWorkoutNotMuch] = useState(s<number>("workoutNotMuch", 75))
  const [workoutLight, setWorkoutLight] = useState(s<number>("workoutLight", 150))
  const [workoutModerate, setWorkoutModerate] = useState(s<number>("workoutModerate", 225))
  const [workoutHeavy, setWorkoutHeavy] = useState(s<number>("workoutHeavy", 300))

  // Check-in & Engagement
  const [defaultCheckInFrequencyDays, setDefaultCheckInFrequencyDays] = useState(s<number>("defaultCheckInFrequencyDays", 7))
  const [notificationTimeUtc, setNotificationTimeUtc] = useState(s<string>("notificationTimeUtc", "09:00"))
  const [recentActivityDays, setRecentActivityDays] = useState(s<number>("recentActivityDays", 14))
  const [lowEngagementEntries, setLowEngagementEntries] = useState(s<number>("lowEngagementEntries", 7))
  const [noActivityDays, setNoActivityDays] = useState(s<number>("noActivityDays", 14))
  const [criticalNoActivityDays, setCriticalNoActivityDays] = useState(s<number>("criticalNoActivityDays", 30))
  const [shortTermWindowDays, setShortTermWindowDays] = useState(s<number>("shortTermWindowDays", 7))
  const [longTermWindowDays, setLongTermWindowDays] = useState(s<number>("longTermWindowDays", 30))

  // Adherence Scoring
  const [adherenceGreenMinimum, setAdherenceGreenMinimum] = useState(s<number>("adherenceGreenMinimum", 6))
  const [adherenceAmberMinimum, setAdherenceAmberMinimum] = useState(s<number>("adherenceAmberMinimum", 3))
  const [attentionMissedCheckinsPolicy, setAttentionMissedCheckinsPolicy] = useState(s<string>("attentionMissedCheckinsPolicy", "option_a"))

  // Body fat categories
  const [bodyFatLowPercent, setBodyFatLowPercent] = useState(s<number>("bodyFatLowPercent", 12.5))
  const [bodyFatMediumPercent, setBodyFatMediumPercent] = useState(s<number>("bodyFatMediumPercent", 20.0))
  const [bodyFatHighPercent, setBodyFatHighPercent] = useState(s<number>("bodyFatHighPercent", 30.0))
  const [bodyFatVeryHighPercent, setBodyFatVeryHighPercent] = useState(s<number>("bodyFatVeryHighPercent", 37.5))

  // Admin
  const [adminOverrideEmail, setAdminOverrideEmail] = useState(s<string>("adminOverrideEmail", ""))

  // Legal Content
  const [termsContentHtml, setTermsContentHtml] = useState(s<string>("termsContentHtml", ""))
  const [privacyContentHtml, setPrivacyContentHtml] = useState(s<string>("privacyContentHtml", ""))
  const [dataProcessingContentHtml, setDataProcessingContentHtml] = useState(s<string>("dataProcessingContentHtml", ""))
  const [consentVersion, setConsentVersion] = useState(s<string>("consentVersion", "1.0.0"))

  async function handleSave(settings: Record<string, unknown>) {
    setError(null)
    setSuccess(false)
    setLoading(true)

    try {
      await updateSystemSettings(settings)
      setSuccess(true)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update settings")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Tabs defaultValue="coach" className="space-y-4">
      <TabsList className="flex flex-wrap h-auto gap-1">
        <TabsTrigger value="coach">Coach</TabsTrigger>
        <TabsTrigger value="features">Features</TabsTrigger>
        <TabsTrigger value="nutrition">Nutrition</TabsTrigger>
        <TabsTrigger value="activity">Activity</TabsTrigger>
        <TabsTrigger value="checkin">Check-in</TabsTrigger>
        <TabsTrigger value="adherence">Adherence</TabsTrigger>
        <TabsTrigger value="legal">Legal</TabsTrigger>
        <TabsTrigger value="admin">Admin</TabsTrigger>
      </TabsList>

      {/* Coach Management Tab */}
      <TabsContent value="coach">
        <Card>
          <CardHeader>
            <CardTitle>Coach Management</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <SettingNumber
              id="maxClientsPerCoach"
              label="Max Clients per Coach"
              description="Maximum number of clients a single coach can manage"
              value={maxClientsPerCoach}
              onChange={setMaxClientsPerCoach}
              min={1}
            />
            <SettingNumber
              id="minClientsPerCoach"
              label="Min Clients per Coach"
              description="Minimum number of clients before a coach is considered underloaded"
              value={minClientsPerCoach}
              onChange={setMinClientsPerCoach}
              min={1}
            />
            <SaveButton
              loading={loading}
              success={success}
              error={error}
              onSave={() => handleSave({ maxClientsPerCoach, minClientsPerCoach })}
            />
          </CardContent>
        </Card>
      </TabsContent>

      {/* Feature Flags Tab */}
      <TabsContent value="features">
        <Card>
          <CardHeader>
            <CardTitle>Feature Flags</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <SettingCheckbox
              id="healthkitEnabled"
              label="Enable HealthKit Integration"
              description="Allow syncing health data from Apple HealthKit"
              checked={healthkitEnabled}
              onChange={setHealthkitEnabled}
            />
            <SettingCheckbox
              id="iosIntegrationEnabled"
              label="Enable iOS Integration"
              description="Allow the iOS companion app to connect"
              checked={iosIntegrationEnabled}
              onChange={setIosIntegrationEnabled}
            />
            <SettingCheckbox
              id="showPersonalizedPlan"
              label="Show Personalized Plan"
              description="Display personalized fitness plans to clients"
              checked={showPersonalizedPlan}
              onChange={setShowPersonalizedPlan}
            />
            <SettingCheckbox
              id="appointmentsEnabled"
              label="Enable Appointments"
              description="Show appointment scheduling in navigation and allow booking"
              checked={appointmentsEnabled}
              onChange={setAppointmentsEnabled}
            />
            <SettingCheckbox
              id="sessionsEnabled"
              label="Enable Sessions"
              description="Show sessions and memberships in navigation"
              checked={sessionsEnabled}
              onChange={setSessionsEnabled}
            />
            <SettingCheckbox
              id="cohortsEnabled"
              label="Enable Cohorts"
              description="Show cohort management in navigation"
              checked={cohortsEnabled}
              onChange={setCohortsEnabled}
            />
            <SaveButton
              loading={loading}
              success={success}
              error={error}
              onSave={() => handleSave({ healthkitEnabled, iosIntegrationEnabled, showPersonalizedPlan, appointmentsEnabled, sessionsEnabled, cohortsEnabled })}
            />
          </CardContent>
        </Card>
      </TabsContent>

      {/* Nutrition Defaults Tab */}
      <TabsContent value="nutrition">
        <Card>
          <CardHeader>
            <CardTitle>Nutrition Defaults</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="text-sm font-medium mb-3">Default Macro Split (%)</h3>
              <div className="grid gap-4 md:grid-cols-3">
                <SettingNumber
                  id="defaultProteinPercent"
                  label="Protein %"
                  value={defaultProteinPercent}
                  onChange={setDefaultProteinPercent}
                  min={0}
                  max={100}
                />
                <SettingNumber
                  id="defaultCarbsPercent"
                  label="Carbs %"
                  value={defaultCarbsPercent}
                  onChange={setDefaultCarbsPercent}
                  min={0}
                  max={100}
                />
                <SettingNumber
                  id="defaultFatPercent"
                  label="Fat %"
                  value={defaultFatPercent}
                  onChange={setDefaultFatPercent}
                  min={0}
                  max={100}
                />
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium mb-3">Calorie Limits</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <SettingNumber
                  id="minDailyCalories"
                  label="Min Daily Calories"
                  description="Minimum allowed daily calorie target"
                  value={minDailyCalories}
                  onChange={setMinDailyCalories}
                  min={500}
                />
                <SettingNumber
                  id="maxDailyCalories"
                  label="Max Daily Calories"
                  description="Maximum allowed daily calorie target"
                  value={maxDailyCalories}
                  onChange={setMaxDailyCalories}
                  min={1000}
                />
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium mb-3">Protein Range (per lb body weight)</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <SettingNumber
                  id="minProteinPerLb"
                  label="Min Protein (g/lb)"
                  value={minProteinPerLb}
                  onChange={setMinProteinPerLb}
                  min={0}
                  step={0.1}
                />
                <SettingNumber
                  id="maxProteinPerLb"
                  label="Max Protein (g/lb)"
                  value={maxProteinPerLb}
                  onChange={setMaxProteinPerLb}
                  min={0}
                  step={0.1}
                />
              </div>
            </div>

            <SaveButton
              loading={loading}
              success={success}
              error={error}
              onSave={() =>
                handleSave({
                  defaultProteinPercent,
                  defaultCarbsPercent,
                  defaultFatPercent,
                  minDailyCalories,
                  maxDailyCalories,
                  minProteinPerLb,
                  maxProteinPerLb,
                })
              }
            />
          </CardContent>
        </Card>
      </TabsContent>

      {/* Activity Thresholds Tab */}
      <TabsContent value="activity">
        <Card>
          <CardHeader>
            <CardTitle>Activity Thresholds</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="text-sm font-medium mb-3">Step Categories (daily steps)</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <SettingNumber
                  id="stepsNotMuch"
                  label="Not Much (below)"
                  description="Below this count = not much activity"
                  value={stepsNotMuch}
                  onChange={setStepsNotMuch}
                  min={0}
                />
                <SettingNumber
                  id="stepsLight"
                  label="Light (below)"
                  description="Below this count = light activity"
                  value={stepsLight}
                  onChange={setStepsLight}
                  min={0}
                />
                <SettingNumber
                  id="stepsModerate"
                  label="Moderate (below)"
                  description="Below this count = moderate activity"
                  value={stepsModerate}
                  onChange={setStepsModerate}
                  min={0}
                />
                <SettingNumber
                  id="stepsHeavy"
                  label="Heavy (above)"
                  description="Above this count = heavy activity"
                  value={stepsHeavy}
                  onChange={setStepsHeavy}
                  min={0}
                />
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium mb-3">Workout Categories (weekly minutes)</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <SettingNumber
                  id="workoutNotMuch"
                  label="Not Much (below)"
                  value={workoutNotMuch}
                  onChange={setWorkoutNotMuch}
                  min={0}
                />
                <SettingNumber
                  id="workoutLight"
                  label="Light (below)"
                  value={workoutLight}
                  onChange={setWorkoutLight}
                  min={0}
                />
                <SettingNumber
                  id="workoutModerate"
                  label="Moderate (below)"
                  value={workoutModerate}
                  onChange={setWorkoutModerate}
                  min={0}
                />
                <SettingNumber
                  id="workoutHeavy"
                  label="Heavy (above)"
                  value={workoutHeavy}
                  onChange={setWorkoutHeavy}
                  min={0}
                />
              </div>
            </div>

            <SaveButton
              loading={loading}
              success={success}
              error={error}
              onSave={() =>
                handleSave({
                  stepsNotMuch,
                  stepsLight,
                  stepsModerate,
                  stepsHeavy,
                  workoutNotMuch,
                  workoutLight,
                  workoutModerate,
                  workoutHeavy,
                })
              }
            />
          </CardContent>
        </Card>
      </TabsContent>

      {/* Check-in & Engagement Tab */}
      <TabsContent value="checkin">
        <Card>
          <CardHeader>
            <CardTitle>Check-in & Engagement</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="text-sm font-medium mb-3">Check-in Settings</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <SettingNumber
                  id="defaultCheckInFrequencyDays"
                  label="Default Check-in Frequency (days)"
                  description="How often clients are prompted to check in"
                  value={defaultCheckInFrequencyDays}
                  onChange={setDefaultCheckInFrequencyDays}
                  min={1}
                />
                <SettingText
                  id="notificationTimeUtc"
                  label="Notification Time (UTC)"
                  description="Time of day to send check-in reminders (HH:MM)"
                  value={notificationTimeUtc}
                  onChange={setNotificationTimeUtc}
                />
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium mb-3">Activity Windows</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <SettingNumber
                  id="recentActivityDays"
                  label="Recent Activity Window (days)"
                  description="Number of days to consider for recent activity"
                  value={recentActivityDays}
                  onChange={setRecentActivityDays}
                  min={1}
                />
                <SettingNumber
                  id="lowEngagementEntries"
                  label="Low Engagement Entries"
                  description="Entries below this count = low engagement"
                  value={lowEngagementEntries}
                  onChange={setLowEngagementEntries}
                  min={1}
                />
                <SettingNumber
                  id="noActivityDays"
                  label="No Activity Days"
                  description="Days without entries before flagging as inactive"
                  value={noActivityDays}
                  onChange={setNoActivityDays}
                  min={1}
                />
                <SettingNumber
                  id="criticalNoActivityDays"
                  label="Critical No Activity Days"
                  description="Days without entries before critical alert"
                  value={criticalNoActivityDays}
                  onChange={setCriticalNoActivityDays}
                  min={1}
                />
                <SettingNumber
                  id="shortTermWindowDays"
                  label="Short-term Window (days)"
                  description="Window for short-term trend analysis"
                  value={shortTermWindowDays}
                  onChange={setShortTermWindowDays}
                  min={1}
                />
                <SettingNumber
                  id="longTermWindowDays"
                  label="Long-term Window (days)"
                  description="Window for long-term trend analysis"
                  value={longTermWindowDays}
                  onChange={setLongTermWindowDays}
                  min={1}
                />
              </div>
            </div>

            <SaveButton
              loading={loading}
              success={success}
              error={error}
              onSave={() =>
                handleSave({
                  defaultCheckInFrequencyDays,
                  notificationTimeUtc,
                  recentActivityDays,
                  lowEngagementEntries,
                  noActivityDays,
                  criticalNoActivityDays,
                  shortTermWindowDays,
                  longTermWindowDays,
                })
              }
            />
          </CardContent>
        </Card>
      </TabsContent>

      {/* Adherence Scoring Tab */}
      <TabsContent value="adherence">
        <Card>
          <CardHeader>
            <CardTitle>Adherence Scoring</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="text-sm font-medium mb-3">Scoring Thresholds</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <SettingNumber
                  id="adherenceGreenMinimum"
                  label="Green Minimum (entries/week)"
                  description="Min entries per week for green adherence status"
                  value={adherenceGreenMinimum}
                  onChange={setAdherenceGreenMinimum}
                  min={0}
                />
                <SettingNumber
                  id="adherenceAmberMinimum"
                  label="Amber Minimum (entries/week)"
                  description="Min entries per week for amber adherence status"
                  value={adherenceAmberMinimum}
                  onChange={setAdherenceAmberMinimum}
                  min={0}
                />
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium mb-3">Missed Check-ins Policy</h3>
              <div className="space-y-2">
                <Label htmlFor="attentionMissedCheckinsPolicy">Policy</Label>
                <select
                  id="attentionMissedCheckinsPolicy"
                  value={attentionMissedCheckinsPolicy}
                  onChange={(e) => setAttentionMissedCheckinsPolicy(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="option_a">Option A - Flag after 1 missed check-in</option>
                  <option value="option_b">Option B - Flag after 2 missed check-ins</option>
                  <option value="option_c">Option C - Flag after 3 missed check-ins</option>
                </select>
                <p className="text-sm text-muted-foreground">
                  How many missed check-ins before flagging for attention
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium mb-3">Body Fat Categories (%)</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <SettingNumber
                  id="bodyFatLowPercent"
                  label="Low (below)"
                  value={bodyFatLowPercent}
                  onChange={setBodyFatLowPercent}
                  min={0}
                  max={100}
                  step={0.5}
                />
                <SettingNumber
                  id="bodyFatMediumPercent"
                  label="Medium (below)"
                  value={bodyFatMediumPercent}
                  onChange={setBodyFatMediumPercent}
                  min={0}
                  max={100}
                  step={0.5}
                />
                <SettingNumber
                  id="bodyFatHighPercent"
                  label="High (below)"
                  value={bodyFatHighPercent}
                  onChange={setBodyFatHighPercent}
                  min={0}
                  max={100}
                  step={0.5}
                />
                <SettingNumber
                  id="bodyFatVeryHighPercent"
                  label="Very High (above)"
                  value={bodyFatVeryHighPercent}
                  onChange={setBodyFatVeryHighPercent}
                  min={0}
                  max={100}
                  step={0.5}
                />
              </div>
            </div>

            <SaveButton
              loading={loading}
              success={success}
              error={error}
              onSave={() =>
                handleSave({
                  adherenceGreenMinimum,
                  adherenceAmberMinimum,
                  attentionMissedCheckinsPolicy,
                  bodyFatLowPercent,
                  bodyFatMediumPercent,
                  bodyFatHighPercent,
                  bodyFatVeryHighPercent,
                })
              }
            />
          </CardContent>
        </Card>
      </TabsContent>

      {/* Legal Content Tab */}
      <TabsContent value="legal">
        <Card>
          <CardHeader>
            <CardTitle>Legal Content</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <SettingText
              id="consentVersion"
              label="Consent Version"
              description="Version string for consent tracking (e.g., 1.0.0). Bump when legal content changes."
              value={consentVersion}
              onChange={setConsentVersion}
            />

            <SettingTextarea
              id="termsContentHtml"
              label="Terms of Service (HTML)"
              description="HTML content for the Terms of Service page"
              value={termsContentHtml}
              onChange={setTermsContentHtml}
              rows={12}
            />

            <SettingTextarea
              id="privacyContentHtml"
              label="Privacy Policy (HTML)"
              description="HTML content for the Privacy Policy page"
              value={privacyContentHtml}
              onChange={setPrivacyContentHtml}
              rows={12}
            />

            <SettingTextarea
              id="dataProcessingContentHtml"
              label="Data Processing Agreement (HTML)"
              description="HTML content for the Data Processing Agreement page"
              value={dataProcessingContentHtml}
              onChange={setDataProcessingContentHtml}
              rows={12}
            />

            <SaveButton
              loading={loading}
              success={success}
              error={error}
              onSave={() =>
                handleSave({
                  consentVersion,
                  termsContentHtml,
                  privacyContentHtml,
                  dataProcessingContentHtml,
                })
              }
            />
          </CardContent>
        </Card>
      </TabsContent>

      {/* Admin Tab */}
      <TabsContent value="admin">
        <Card>
          <CardHeader>
            <CardTitle>Admin Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <SettingText
              id="adminOverrideEmail"
              label="Admin Override Email"
              description="Override email for all outgoing messages (leave empty to disable)"
              value={adminOverrideEmail}
              onChange={setAdminOverrideEmail}
            />
            <SaveButton
              loading={loading}
              success={success}
              error={error}
              onSave={() => handleSave({ adminOverrideEmail })}
            />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
