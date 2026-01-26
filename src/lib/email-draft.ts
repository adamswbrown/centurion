import { format } from "date-fns"

/**
 * Email Draft Generation Utilities
 * Client-side utility for generating email drafts
 * Generated with Claude Code
 */

export interface EmailDraftInput {
  clientName: string | null
  weekStart: string
  stats: {
    checkInCount: number
    checkInRate: number
    avgWeight: number | null
    weightTrend: number | null
    avgSteps: number | null
  }
  loomUrl?: string | null
}

function getSunday(monday: Date): Date {
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)
  return sunday
}

export function generateWeeklyEmailDraft(input: EmailDraftInput): string {
  const { clientName, weekStart, stats, loomUrl } = input
  const greeting = clientName ? `Hi ${clientName}` : "Hi there"

  const weekEndDate = getSunday(new Date(weekStart))
  const weekRange = `${format(new Date(weekStart), "MMMM d")} - ${format(weekEndDate, "MMMM d, yyyy")}`

  let body = `${greeting},

Here's your weekly progress summary for ${weekRange}:

**Check-ins:** ${stats.checkInCount} (${Math.round(stats.checkInRate * 100)}% of target)`

  if (stats.avgWeight !== null) {
    body += `\n**Average Weight:** ${stats.avgWeight.toFixed(1)} lbs`
    if (stats.weightTrend !== null) {
      const trend = stats.weightTrend > 0 ? "+" : ""
      body += ` (${trend}${stats.weightTrend.toFixed(1)} from week start)`
    }
  }

  if (stats.avgSteps !== null) {
    body += `\n**Average Steps:** ${stats.avgSteps.toLocaleString()}`
  }

  if (loomUrl) {
    body += `\n\n**Video Feedback:** ${loomUrl}`
  }

  body += `

Keep up the great work! Let me know if you have any questions.

Best,
Your Coach`

  return body
}
