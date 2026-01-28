import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"

vi.mock("@/app/actions/preferences", () => ({
  getUserPreferences: vi.fn(),
}))

import { getUserPreferences } from "@/app/actions/preferences"
import { usePreferences } from "@/hooks/usePreferences"

describe("usePreferences", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("starts with loading state and default preferences", () => {
    vi.mocked(getUserPreferences).mockImplementation(
      () => new Promise(() => {})
    )

    const { result } = renderHook(() => usePreferences())

    expect(result.current.loading).toBe(true)
    expect(result.current.preferences).toEqual({
      weightUnit: "lbs",
      measurementUnit: "inches",
      dateFormat: "MM/dd/yyyy",
    })
  })

  it("loads user preferences successfully", async () => {
    const mockPreferences = {
      weightUnit: "kg" as const,
      measurementUnit: "cm" as const,
      dateFormat: "dd/MM/yyyy" as const,
    }

    vi.mocked(getUserPreferences).mockResolvedValue(mockPreferences)

    const { result } = renderHook(() => usePreferences())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.preferences).toEqual({
      weightUnit: "kg",
      measurementUnit: "cm",
      dateFormat: "dd/MM/yyyy",
    })
    expect(getUserPreferences).toHaveBeenCalled()
  })

  it("uses default preferences when getUserPreferences throws", async () => {
    vi.mocked(getUserPreferences).mockRejectedValue(
      new Error("Failed to load preferences")
    )

    const { result } = renderHook(() => usePreferences())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.preferences).toEqual({
      weightUnit: "lbs",
      measurementUnit: "inches",
      dateFormat: "MM/dd/yyyy",
    })
  })

  it("uses default values for partial preferences", async () => {
    vi.mocked(getUserPreferences).mockResolvedValue({
      weightUnit: "kg" as const,
      measurementUnit: null,
      dateFormat: null,
    })

    const { result } = renderHook(() => usePreferences())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.preferences).toEqual({
      weightUnit: "kg",
      measurementUnit: "inches",
      dateFormat: "MM/dd/yyyy",
    })
  })

  it("displayWeight returns -- for null value", async () => {
    vi.mocked(getUserPreferences).mockResolvedValue({
      weightUnit: "lbs" as const,
      measurementUnit: "inches" as const,
      dateFormat: "MM/dd/yyyy" as const,
    })

    const { result } = renderHook(() => usePreferences())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.displayWeight(null)).toBe("--")
  })

  it("displayWeight returns formatted value for valid input", async () => {
    vi.mocked(getUserPreferences).mockResolvedValue({
      weightUnit: "lbs" as const,
      measurementUnit: "inches" as const,
      dateFormat: "MM/dd/yyyy" as const,
    })

    const { result } = renderHook(() => usePreferences())

    await waitFor(() => expect(result.current.loading).toBe(false))

    const valueInKg = 68.0
    const displayValue = result.current.displayWeight(valueInKg)
    expect(displayValue).toContain("lbs")
    expect(displayValue).not.toBe("--")
  })

  it("displayHeight returns -- for null value", async () => {
    vi.mocked(getUserPreferences).mockResolvedValue({
      weightUnit: "lbs" as const,
      measurementUnit: "inches" as const,
      dateFormat: "MM/dd/yyyy" as const,
    })

    const { result } = renderHook(() => usePreferences())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.displayHeight(null)).toBe("--")
  })

  it("displayHeight returns formatted value for valid input", async () => {
    vi.mocked(getUserPreferences).mockResolvedValue({
      weightUnit: "lbs" as const,
      measurementUnit: "inches" as const,
      dateFormat: "MM/dd/yyyy" as const,
    })

    const { result } = renderHook(() => usePreferences())

    await waitFor(() => expect(result.current.loading).toBe(false))

    const valueInCm = 175.0
    const displayValue = result.current.displayHeight(valueInCm)
    expect(displayValue).toContain("in")
    expect(displayValue).not.toBe("--")
  })

  it("displayDate returns -- for null value", async () => {
    vi.mocked(getUserPreferences).mockResolvedValue({
      weightUnit: "lbs" as const,
      measurementUnit: "inches" as const,
      dateFormat: "MM/dd/yyyy" as const,
    })

    const { result } = renderHook(() => usePreferences())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.displayDate(null)).toBe("--")
  })

  it("displayDate returns -- for undefined value", async () => {
    vi.mocked(getUserPreferences).mockResolvedValue({
      weightUnit: "lbs" as const,
      measurementUnit: "inches" as const,
      dateFormat: "MM/dd/yyyy" as const,
    })

    const { result } = renderHook(() => usePreferences())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.displayDate(undefined)).toBe("--")
  })

  it("displayDate returns formatted date for valid input", async () => {
    vi.mocked(getUserPreferences).mockResolvedValue({
      weightUnit: "lbs" as const,
      measurementUnit: "inches" as const,
      dateFormat: "MM/dd/yyyy" as const,
    })

    const { result } = renderHook(() => usePreferences())

    await waitFor(() => expect(result.current.loading).toBe(false))

    const date = new Date("2025-01-15")
    const displayValue = result.current.displayDate(date)
    expect(displayValue).not.toBe("--")
    expect(displayValue).toMatch(/\d{2}\/\d{2}\/\d{4}/)
  })

  it("weightValue returns null for null input", async () => {
    vi.mocked(getUserPreferences).mockResolvedValue({
      weightUnit: "lbs" as const,
      measurementUnit: "inches" as const,
      dateFormat: "MM/dd/yyyy" as const,
    })

    const { result } = renderHook(() => usePreferences())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.weightValue(null)).toBeNull()
  })

  it("weightValue returns converted number for valid input", async () => {
    vi.mocked(getUserPreferences).mockResolvedValue({
      weightUnit: "lbs" as const,
      measurementUnit: "inches" as const,
      dateFormat: "MM/dd/yyyy" as const,
    })

    const { result } = renderHook(() => usePreferences())

    await waitFor(() => expect(result.current.loading).toBe(false))

    const valueInKg = 68.0
    const convertedValue = result.current.weightValue(valueInKg)
    expect(convertedValue).not.toBeNull()
    expect(typeof convertedValue).toBe("number")
  })

  it("heightValue returns null for null input", async () => {
    vi.mocked(getUserPreferences).mockResolvedValue({
      weightUnit: "lbs" as const,
      measurementUnit: "inches" as const,
      dateFormat: "MM/dd/yyyy" as const,
    })

    const { result } = renderHook(() => usePreferences())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.heightValue(null)).toBeNull()
  })

  it("heightValue returns converted number for valid input", async () => {
    vi.mocked(getUserPreferences).mockResolvedValue({
      weightUnit: "lbs" as const,
      measurementUnit: "inches" as const,
      dateFormat: "MM/dd/yyyy" as const,
    })

    const { result } = renderHook(() => usePreferences())

    await waitFor(() => expect(result.current.loading).toBe(false))

    const valueInCm = 175.0
    const convertedValue = result.current.heightValue(valueInCm)
    expect(convertedValue).not.toBeNull()
    expect(typeof convertedValue).toBe("number")
  })
})
