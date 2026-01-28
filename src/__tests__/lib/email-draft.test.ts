import { describe, it, expect } from "vitest"
import { generateWeeklyEmailDraft, type EmailDraftInput } from "@/lib/email-draft"

describe("generateWeeklyEmailDraft", () => {
  const baseInput: EmailDraftInput = {
    clientName: "John Doe",
    weekStart: "2025-01-27", // Monday
    stats: {
      checkInCount: 5,
      checkInRate: 0.71,
      avgWeight: null,
      weightTrend: null,
      avgSteps: null,
    },
  }

  it("includes client name greeting", () => {
    const result = generateWeeklyEmailDraft(baseInput)

    expect(result).toContain("Hi John Doe")
  })

  it('uses "Hi there" when clientName is null', () => {
    const input = { ...baseInput, clientName: null }
    const result = generateWeeklyEmailDraft(input)

    expect(result).toContain("Hi there")
    expect(result).not.toContain("Hi John Doe")
  })

  it("includes week date range", () => {
    const result = generateWeeklyEmailDraft(baseInput)

    // Monday Jan 27 to Sunday Feb 2, 2025
    expect(result).toContain("January 27 - February 2, 2025")
  })

  it("includes check-in count and rate", () => {
    const result = generateWeeklyEmailDraft(baseInput)

    expect(result).toContain("Check-ins:** 5")
    expect(result).toContain("71% of target")
  })

  it("includes average weight when provided", () => {
    const input: EmailDraftInput = {
      ...baseInput,
      stats: { ...baseInput.stats, avgWeight: 185.5 },
    }
    const result = generateWeeklyEmailDraft(input)

    expect(result).toContain("Average Weight:** 185.5 lbs")
  })

  it("includes positive weight trend", () => {
    const input: EmailDraftInput = {
      ...baseInput,
      stats: { ...baseInput.stats, avgWeight: 185.5, weightTrend: 2.3 },
    }
    const result = generateWeeklyEmailDraft(input)

    expect(result).toContain("Average Weight:** 185.5 lbs (+2.3 from week start)")
  })

  it("includes negative weight trend", () => {
    const input: EmailDraftInput = {
      ...baseInput,
      stats: { ...baseInput.stats, avgWeight: 182.7, weightTrend: -3.2 },
    }
    const result = generateWeeklyEmailDraft(input)

    expect(result).toContain("Average Weight:** 182.7 lbs (-3.2 from week start)")
  })

  it("omits weight when avgWeight is null", () => {
    const result = generateWeeklyEmailDraft(baseInput)

    expect(result).not.toContain("Average Weight")
    expect(result).not.toContain("lbs")
  })

  it("includes average steps when provided", () => {
    const input: EmailDraftInput = {
      ...baseInput,
      stats: { ...baseInput.stats, avgSteps: 8543 },
    }
    const result = generateWeeklyEmailDraft(input)

    expect(result).toContain("Average Steps:** 8,543")
  })

  it("omits steps when avgSteps is null", () => {
    const result = generateWeeklyEmailDraft(baseInput)

    expect(result).not.toContain("Average Steps")
  })

  it("includes loom URL when provided", () => {
    const input: EmailDraftInput = {
      ...baseInput,
      loomUrl: "https://loom.com/share/abc123",
    }
    const result = generateWeeklyEmailDraft(input)

    expect(result).toContain("Video Feedback:** https://loom.com/share/abc123")
  })

  it("omits video feedback when no loomUrl", () => {
    const result = generateWeeklyEmailDraft(baseInput)

    expect(result).not.toContain("Video Feedback")
  })

  it("omits video feedback when loomUrl is null", () => {
    const input: EmailDraftInput = {
      ...baseInput,
      loomUrl: null,
    }
    const result = generateWeeklyEmailDraft(input)

    expect(result).not.toContain("Video Feedback")
  })

  it("includes closing message", () => {
    const result = generateWeeklyEmailDraft(baseInput)

    expect(result).toContain("Keep up the great work!")
    expect(result).toContain("Best,\nYour Coach")
  })

  it("generates complete email with all fields", () => {
    const input: EmailDraftInput = {
      clientName: "Jane Smith",
      weekStart: "2025-02-03", // Monday
      stats: {
        checkInCount: 7,
        checkInRate: 1.0,
        avgWeight: 142.3,
        weightTrend: -1.5,
        avgSteps: 10250,
      },
      loomUrl: "https://loom.com/share/xyz789",
    }
    const result = generateWeeklyEmailDraft(input)

    expect(result).toContain("Hi Jane Smith")
    expect(result).toContain("February 3 - February 9, 2025")
    expect(result).toContain("Check-ins:** 7 (100% of target)")
    expect(result).toContain("Average Weight:** 142.3 lbs (-1.5 from week start)")
    expect(result).toContain("Average Steps:** 10,250")
    expect(result).toContain("Video Feedback:** https://loom.com/share/xyz789")
    expect(result).toContain("Best,\nYour Coach")
  })

  it("rounds check-in rate to nearest whole number", () => {
    const input: EmailDraftInput = {
      ...baseInput,
      stats: { ...baseInput.stats, checkInCount: 4, checkInRate: 0.5714 },
    }
    const result = generateWeeklyEmailDraft(input)

    expect(result).toContain("57% of target")
  })

  it("handles zero check-ins", () => {
    const input: EmailDraftInput = {
      ...baseInput,
      stats: { ...baseInput.stats, checkInCount: 0, checkInRate: 0 },
    }
    const result = generateWeeklyEmailDraft(input)

    expect(result).toContain("Check-ins:** 0 (0% of target)")
  })

  it("formats weight to one decimal place", () => {
    const input: EmailDraftInput = {
      ...baseInput,
      stats: { ...baseInput.stats, avgWeight: 175.666 },
    }
    const result = generateWeeklyEmailDraft(input)

    expect(result).toContain("175.7 lbs")
  })

  it("formats weight trend to one decimal place", () => {
    const input: EmailDraftInput = {
      ...baseInput,
      stats: { ...baseInput.stats, avgWeight: 180, weightTrend: 1.234 },
    }
    const result = generateWeeklyEmailDraft(input)

    expect(result).toContain("+1.2 from week start")
  })

  it("formats steps with thousand separators", () => {
    const input: EmailDraftInput = {
      ...baseInput,
      stats: { ...baseInput.stats, avgSteps: 12345 },
    }
    const result = generateWeeklyEmailDraft(input)

    expect(result).toContain("12,345")
  })
})
