"use client"

import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  Bell,
  BellOff,
  Mail,
  Smartphone,
  TestTube,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { usePushNotifications } from "@/hooks/usePushNotifications"
import {
  getNotificationPreferences,
  updateNotificationPreferences,
  type NotificationPreferencesInput,
} from "@/app/actions/push-notifications"

const preferencesSchema = z.object({
  pushEnabled: z.boolean(),
  emailEnabled: z.boolean(),
  dailyCheckInReminder: z.boolean(),
  dailyCheckInTime: z.string(),
  weeklyQuestionnaireReminder: z.boolean(),
  weeklyQuestionnaireDay: z.number(),
  progressNotifications: z.boolean(),
  stepGoalCelebrations: z.boolean(),
  streakNotifications: z.boolean(),
  appointmentReminder24h: z.boolean(),
  appointmentReminder1h: z.boolean(),
  sessionReminder24h: z.boolean(),
  sessionReminder1h: z.boolean(),
  coachNoteReceived: z.boolean(),
  weeklyReviewReady: z.boolean(),
  clientCheckInReceived: z.boolean(),
  questionnaireSubmitted: z.boolean(),
  attentionScoreAlerts: z.boolean(),
  invoiceReceived: z.boolean(),
  paymentReminders: z.boolean(),
  systemAnnouncements: z.boolean(),
})

type PreferencesForm = z.infer<typeof preferencesSchema>

interface NotificationSettingsProps {
  role: "CLIENT" | "COACH" | "ADMIN"
}

const dayOptions = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
]

const timeOptions = Array.from({ length: 24 }, (_, i) => ({
  value: `${i.toString().padStart(2, "0")}:00`,
  label: `${i === 0 ? "12" : i > 12 ? i - 12 : i}:00 ${i < 12 ? "AM" : "PM"}`,
}))

export function NotificationSettings({ role }: NotificationSettingsProps) {
  const queryClient = useQueryClient()
  const {
    isSupported,
    permission,
    isSubscribed,
    subscribe,
    unsubscribe,
    sendTest,
    isSubscribing,
    isUnsubscribing,
    isSendingTest,
    subscriptionCount,
    error: pushError,
  } = usePushNotifications()

  const {
    data: preferences,
    isLoading,
    error: prefsError,
  } = useQuery({
    queryKey: ["notificationPreferences"],
    queryFn: getNotificationPreferences,
  })

  const mutation = useMutation({
    mutationFn: updateNotificationPreferences,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notificationPreferences"] })
    },
  })

  const form = useForm<PreferencesForm>({
    resolver: zodResolver(preferencesSchema),
    defaultValues: {
      pushEnabled: true,
      emailEnabled: true,
      dailyCheckInReminder: true,
      dailyCheckInTime: "09:00",
      weeklyQuestionnaireReminder: true,
      weeklyQuestionnaireDay: 0,
      progressNotifications: true,
      stepGoalCelebrations: true,
      streakNotifications: true,
      appointmentReminder24h: true,
      appointmentReminder1h: true,
      sessionReminder24h: true,
      sessionReminder1h: true,
      coachNoteReceived: true,
      weeklyReviewReady: true,
      clientCheckInReceived: true,
      questionnaireSubmitted: true,
      attentionScoreAlerts: true,
      invoiceReceived: true,
      paymentReminders: true,
      systemAnnouncements: true,
    },
  })

  // Update form when preferences load
  useEffect(() => {
    if (preferences) {
      form.reset({
        pushEnabled: preferences.pushEnabled,
        emailEnabled: preferences.emailEnabled,
        dailyCheckInReminder: preferences.dailyCheckInReminder,
        dailyCheckInTime: preferences.dailyCheckInTime,
        weeklyQuestionnaireReminder: preferences.weeklyQuestionnaireReminder,
        weeklyQuestionnaireDay: preferences.weeklyQuestionnaireDay,
        progressNotifications: preferences.progressNotifications,
        stepGoalCelebrations: preferences.stepGoalCelebrations,
        streakNotifications: preferences.streakNotifications,
        appointmentReminder24h: preferences.appointmentReminder24h,
        appointmentReminder1h: preferences.appointmentReminder1h,
        sessionReminder24h: preferences.sessionReminder24h,
        sessionReminder1h: preferences.sessionReminder1h,
        coachNoteReceived: preferences.coachNoteReceived,
        weeklyReviewReady: preferences.weeklyReviewReady,
        clientCheckInReceived: preferences.clientCheckInReceived,
        questionnaireSubmitted: preferences.questionnaireSubmitted,
        attentionScoreAlerts: preferences.attentionScoreAlerts,
        invoiceReceived: preferences.invoiceReceived,
        paymentReminders: preferences.paymentReminders,
        systemAnnouncements: preferences.systemAnnouncements,
      })
    }
  }, [preferences, form])

  const handleToggle = (field: keyof PreferencesForm, value: boolean) => {
    form.setValue(field, value)
    mutation.mutate({ [field]: value } as NotificationPreferencesInput)
  }

  const handleSelectChange = (
    field: keyof PreferencesForm,
    value: string | number
  ) => {
    form.setValue(field, value as never)
    mutation.mutate({ [field]: value } as NotificationPreferencesInput)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (prefsError) {
    return (
      <div className="flex items-center gap-2 p-4 text-destructive">
        <AlertCircle className="h-5 w-5" />
        <span>Failed to load notification preferences</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Push Notification Setup */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Push Notifications
          </CardTitle>
          <CardDescription>
            Receive notifications on your device even when the app is closed
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isSupported ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <AlertCircle className="h-4 w-4" />
              Push notifications are not supported in this browser.
            </div>
          ) : permission === "denied" ? (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <BellOff className="h-4 w-4" />
              Notifications are blocked. Please enable them in your browser
              settings.
            </div>
          ) : isSubscribed ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <CheckCircle2 className="h-4 w-4" />
                  Push notifications enabled
                  {subscriptionCount > 1 && (
                    <span className="text-muted-foreground">
                      ({subscriptionCount} devices)
                    </span>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={unsubscribe}
                  disabled={isUnsubscribing}
                >
                  {isUnsubscribing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Disabling...
                    </>
                  ) : (
                    "Disable"
                  )}
                </Button>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={sendTest}
                disabled={isSendingTest}
              >
                {isSendingTest ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <TestTube className="mr-2 h-4 w-4" />
                    Send Test Notification
                  </>
                )}
              </Button>
            </div>
          ) : (
            <Button onClick={subscribe} disabled={isSubscribing}>
              {isSubscribing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enabling...
                </>
              ) : (
                <>
                  <Bell className="mr-2 h-4 w-4" />
                  Enable Push Notifications
                </>
              )}
            </Button>
          )}
          {pushError && (
            <div className="text-sm text-destructive">{pushError.message}</div>
          )}
        </CardContent>
      </Card>

      {/* Master Toggles */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Channels</CardTitle>
          <CardDescription>
            Control how you receive notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Smartphone className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="pushEnabled">Push Notifications</Label>
            </div>
            <Switch
              id="pushEnabled"
              checked={form.watch("pushEnabled")}
              onCheckedChange={(v) => handleToggle("pushEnabled", v)}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="emailEnabled">Email Notifications</Label>
            </div>
            <Switch
              id="emailEnabled"
              checked={form.watch("emailEnabled")}
              onCheckedChange={(v) => handleToggle("emailEnabled", v)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Daily Check-in Reminders (CLIENT only) */}
      {role === "CLIENT" && (
        <Card>
          <CardHeader>
            <CardTitle>Daily Check-in Reminders</CardTitle>
            <CardDescription>
              Get reminded to log your daily progress
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="dailyCheckInReminder">
                Enable Daily Reminders
              </Label>
              <Switch
                id="dailyCheckInReminder"
                checked={form.watch("dailyCheckInReminder")}
                onCheckedChange={(v) => handleToggle("dailyCheckInReminder", v)}
              />
            </div>
            {form.watch("dailyCheckInReminder") && (
              <div className="flex items-center gap-4">
                <Label>Reminder Time</Label>
                <Select
                  value={form.watch("dailyCheckInTime")}
                  onValueChange={(v) =>
                    handleSelectChange("dailyCheckInTime", v)
                  }
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {timeOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Weekly Questionnaire Reminders (CLIENT only) */}
      {role === "CLIENT" && (
        <Card>
          <CardHeader>
            <CardTitle>Weekly Questionnaire Reminders</CardTitle>
            <CardDescription>
              Get reminded to complete your weekly questionnaire
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="weeklyQuestionnaireReminder">
                Enable Weekly Reminders
              </Label>
              <Switch
                id="weeklyQuestionnaireReminder"
                checked={form.watch("weeklyQuestionnaireReminder")}
                onCheckedChange={(v) =>
                  handleToggle("weeklyQuestionnaireReminder", v)
                }
              />
            </div>
            {form.watch("weeklyQuestionnaireReminder") && (
              <div className="flex items-center gap-4">
                <Label>Reminder Day</Label>
                <Select
                  value={form.watch("weeklyQuestionnaireDay").toString()}
                  onValueChange={(v) =>
                    handleSelectChange("weeklyQuestionnaireDay", parseInt(v))
                  }
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {dayOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value.toString()}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Progress & Motivation (CLIENT only) */}
      {role === "CLIENT" && (
        <Card>
          <CardHeader>
            <CardTitle>Progress & Motivation</CardTitle>
            <CardDescription>
              Celebrate your achievements and stay motivated
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="stepGoalCelebrations">Step Goal Celebrations</Label>
              <Switch
                id="stepGoalCelebrations"
                checked={form.watch("stepGoalCelebrations")}
                onCheckedChange={(v) => handleToggle("stepGoalCelebrations", v)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="streakNotifications">Streak Notifications</Label>
              <Switch
                id="streakNotifications"
                checked={form.watch("streakNotifications")}
                onCheckedChange={(v) => handleToggle("streakNotifications", v)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="progressNotifications">Progress Updates</Label>
              <Switch
                id="progressNotifications"
                checked={form.watch("progressNotifications")}
                onCheckedChange={(v) => handleToggle("progressNotifications", v)}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Appointment & Session Reminders */}
      <Card>
        <CardHeader>
          <CardTitle>Appointment Reminders</CardTitle>
          <CardDescription>
            Get reminded about upcoming appointments
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="appointmentReminder24h">24 Hours Before</Label>
            <Switch
              id="appointmentReminder24h"
              checked={form.watch("appointmentReminder24h")}
              onCheckedChange={(v) => handleToggle("appointmentReminder24h", v)}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="appointmentReminder1h">1 Hour Before</Label>
            <Switch
              id="appointmentReminder1h"
              checked={form.watch("appointmentReminder1h")}
              onCheckedChange={(v) => handleToggle("appointmentReminder1h", v)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Session Reminders */}
      <Card>
        <CardHeader>
          <CardTitle>Session Reminders</CardTitle>
          <CardDescription>
            Get reminded about group sessions and classes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="sessionReminder24h">24 Hours Before</Label>
            <Switch
              id="sessionReminder24h"
              checked={form.watch("sessionReminder24h")}
              onCheckedChange={(v) => handleToggle("sessionReminder24h", v)}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="sessionReminder1h">1 Hour Before</Label>
            <Switch
              id="sessionReminder1h"
              checked={form.watch("sessionReminder1h")}
              onCheckedChange={(v) => handleToggle("sessionReminder1h", v)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Coach Notifications (for Clients) */}
      {role === "CLIENT" && (
        <Card>
          <CardHeader>
            <CardTitle>Coach Updates</CardTitle>
            <CardDescription>
              Notifications from your coach
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="coachNoteReceived">New Coach Notes</Label>
              <Switch
                id="coachNoteReceived"
                checked={form.watch("coachNoteReceived")}
                onCheckedChange={(v) => handleToggle("coachNoteReceived", v)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="weeklyReviewReady">Weekly Review Ready</Label>
              <Switch
                id="weeklyReviewReady"
                checked={form.watch("weeklyReviewReady")}
                onCheckedChange={(v) => handleToggle("weeklyReviewReady", v)}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Client Activity Notifications (for Coaches) */}
      {(role === "COACH" || role === "ADMIN") && (
        <Card>
          <CardHeader>
            <CardTitle>Client Activity</CardTitle>
            <CardDescription>
              Notifications about your clients
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="clientCheckInReceived">Client Check-ins</Label>
              <Switch
                id="clientCheckInReceived"
                checked={form.watch("clientCheckInReceived")}
                onCheckedChange={(v) => handleToggle("clientCheckInReceived", v)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="questionnaireSubmitted">
                Questionnaire Submissions
              </Label>
              <Switch
                id="questionnaireSubmitted"
                checked={form.watch("questionnaireSubmitted")}
                onCheckedChange={(v) =>
                  handleToggle("questionnaireSubmitted", v)
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="attentionScoreAlerts">
                Attention Score Alerts
              </Label>
              <Switch
                id="attentionScoreAlerts"
                checked={form.watch("attentionScoreAlerts")}
                onCheckedChange={(v) => handleToggle("attentionScoreAlerts", v)}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Billing & Payments */}
      <Card>
        <CardHeader>
          <CardTitle>Billing & Payments</CardTitle>
          <CardDescription>
            Invoice and payment notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="invoiceReceived">Invoice Received</Label>
            <Switch
              id="invoiceReceived"
              checked={form.watch("invoiceReceived")}
              onCheckedChange={(v) => handleToggle("invoiceReceived", v)}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="paymentReminders">Payment Reminders</Label>
            <Switch
              id="paymentReminders"
              checked={form.watch("paymentReminders")}
              onCheckedChange={(v) => handleToggle("paymentReminders", v)}
            />
          </div>
        </CardContent>
      </Card>

      {/* System Notifications */}
      <Card>
        <CardHeader>
          <CardTitle>System</CardTitle>
          <CardDescription>
            Important system announcements
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <Label htmlFor="systemAnnouncements">System Announcements</Label>
            <Switch
              id="systemAnnouncements"
              checked={form.watch("systemAnnouncements")}
              onCheckedChange={(v) => handleToggle("systemAnnouncements", v)}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
