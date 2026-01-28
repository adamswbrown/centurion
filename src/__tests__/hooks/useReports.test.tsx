import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ReactNode } from "react"

vi.mock("@/app/actions/reports", () => ({
  getDashboardOverview: vi.fn(),
  getMemberEngagementReport: vi.fn(),
  getCohortReport: vi.fn(),
  getRevenueReport: vi.fn(),
  getComplianceReport: vi.fn(),
  getSessionAttendanceReport: vi.fn(),
  getMembershipReport: vi.fn(),
  exportReportData: vi.fn(),
}))

import {
  getDashboardOverview,
  getMemberEngagementReport,
  getCohortReport,
  getRevenueReport,
  getComplianceReport,
  getSessionAttendanceReport,
  getMembershipReport,
  exportReportData,
} from "@/app/actions/reports"
import {
  useDashboardOverview,
  useMemberEngagementReport,
  useCohortReport,
  useRevenueReport,
  useComplianceReport,
  useExportReport,
  useSessionAttendanceReport,
  useMembershipReport,
} from "@/hooks/useReports"

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  })
}

function createWrapper() {
  const queryClient = createTestQueryClient()
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
  }
}

describe("useDashboardOverview", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should fetch dashboard overview successfully", async () => {
    const mockOverview = {
      totalMembers: 100,
      activeMembers: 85,
      totalRevenue: 50000,
      pendingInvoices: 5,
    }

    vi.mocked(getDashboardOverview).mockResolvedValue(mockOverview)

    const { result } = renderHook(() => useDashboardOverview(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(mockOverview)
    expect(getDashboardOverview).toHaveBeenCalledTimes(1)
  })

  it("should handle error when fetching dashboard overview", async () => {
    const mockError = new Error("Failed to fetch overview")
    vi.mocked(getDashboardOverview).mockRejectedValue(mockError)

    const { result } = renderHook(() => useDashboardOverview(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toEqual(mockError)
  })
})

describe("useMemberEngagementReport", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should fetch member engagement report successfully", async () => {
    const mockReport = {
      members: [
        { id: 1, name: "John Doe", engagementScore: 85 },
        { id: 2, name: "Jane Smith", engagementScore: 90 },
      ],
    }

    vi.mocked(getMemberEngagementReport).mockResolvedValue(mockReport)

    const dateRange = { startDate: "2025-01-01", endDate: "2025-01-31" }
    const { result } = renderHook(
      () => useMemberEngagementReport(dateRange),
      {
        wrapper: createWrapper(),
      }
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(mockReport)
    expect(getMemberEngagementReport).toHaveBeenCalledWith(dateRange)
  })

  it("should handle error when fetching member engagement report", async () => {
    const mockError = new Error("Failed to fetch report")
    vi.mocked(getMemberEngagementReport).mockRejectedValue(mockError)

    const { result } = renderHook(() => useMemberEngagementReport(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toEqual(mockError)
  })

  it("should fetch without date range", async () => {
    const mockReport = { members: [] }
    vi.mocked(getMemberEngagementReport).mockResolvedValue(mockReport)

    const { result } = renderHook(() => useMemberEngagementReport(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(getMemberEngagementReport).toHaveBeenCalledWith(undefined)
  })
})

describe("useCohortReport", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should fetch cohort report successfully", async () => {
    const mockReport = {
      cohorts: [
        { id: 1, name: "Cohort A", memberCount: 15, completionRate: 80 },
        { id: 2, name: "Cohort B", memberCount: 20, completionRate: 75 },
      ],
    }

    vi.mocked(getCohortReport).mockResolvedValue(mockReport)

    const { result } = renderHook(() => useCohortReport(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(mockReport)
    expect(getCohortReport).toHaveBeenCalledTimes(1)
  })

  it("should handle error when fetching cohort report", async () => {
    const mockError = new Error("Failed to fetch cohort report")
    vi.mocked(getCohortReport).mockRejectedValue(mockError)

    const { result } = renderHook(() => useCohortReport(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toEqual(mockError)
  })
})

describe("useRevenueReport", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should fetch revenue report successfully", async () => {
    const mockReport = {
      year: 2025,
      totalRevenue: 120000,
      monthlyBreakdown: [],
    }

    vi.mocked(getRevenueReport).mockResolvedValue(mockReport)

    const { result } = renderHook(() => useRevenueReport(2025), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(mockReport)
    expect(getRevenueReport).toHaveBeenCalledWith(2025)
  })

  it("should handle error when fetching revenue report", async () => {
    const mockError = new Error("Failed to fetch revenue report")
    vi.mocked(getRevenueReport).mockRejectedValue(mockError)

    const { result } = renderHook(() => useRevenueReport(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toEqual(mockError)
  })

  it("should fetch without year parameter", async () => {
    const mockReport = { year: 2025, totalRevenue: 0, monthlyBreakdown: [] }
    vi.mocked(getRevenueReport).mockResolvedValue(mockReport)

    const { result } = renderHook(() => useRevenueReport(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(getRevenueReport).toHaveBeenCalledWith(undefined)
  })
})

describe("useComplianceReport", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should fetch compliance report successfully", async () => {
    const mockReport = {
      totalAudits: 50,
      compliantActions: 48,
      complianceRate: 96,
    }

    vi.mocked(getComplianceReport).mockResolvedValue(mockReport)

    const { result } = renderHook(() => useComplianceReport(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(mockReport)
    expect(getComplianceReport).toHaveBeenCalledTimes(1)
  })

  it("should handle error when fetching compliance report", async () => {
    const mockError = new Error("Failed to fetch compliance report")
    vi.mocked(getComplianceReport).mockRejectedValue(mockError)

    const { result } = renderHook(() => useComplianceReport(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toEqual(mockError)
  })
})

describe("useSessionAttendanceReport", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should fetch session attendance report successfully", async () => {
    const mockReport = {
      totalSessions: 100,
      attendedSessions: 85,
      attendanceRate: 85,
    }

    vi.mocked(getSessionAttendanceReport).mockResolvedValue(mockReport)

    const { result } = renderHook(() => useSessionAttendanceReport(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(mockReport)
    expect(getSessionAttendanceReport).toHaveBeenCalledTimes(1)
  })

  it("should handle error when fetching session attendance report", async () => {
    const mockError = new Error("Failed to fetch attendance report")
    vi.mocked(getSessionAttendanceReport).mockRejectedValue(mockError)

    const { result } = renderHook(() => useSessionAttendanceReport(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toEqual(mockError)
  })
})

describe("useMembershipReport", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should fetch membership report successfully", async () => {
    const mockReport = {
      totalMemberships: 150,
      activeMemberships: 120,
      pausedMemberships: 20,
      inactiveMemberships: 10,
    }

    vi.mocked(getMembershipReport).mockResolvedValue(mockReport)

    const { result } = renderHook(() => useMembershipReport(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(mockReport)
    expect(getMembershipReport).toHaveBeenCalledTimes(1)
  })

  it("should handle error when fetching membership report", async () => {
    const mockError = new Error("Failed to fetch membership report")
    vi.mocked(getMembershipReport).mockRejectedValue(mockError)

    const { result } = renderHook(() => useMembershipReport(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toEqual(mockError)
  })
})

describe("useExportReport", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.clearAllMocks()
  })

  it("should export report data successfully", async () => {
    const mockData = {
      content: "col1,col2\nval1,val2",
      contentType: "text/csv",
      filename: "report.csv",
    }
    vi.mocked(exportReportData).mockResolvedValue(mockData as any)

    // Mock DOM APIs used in onSuccess AFTER renderHook (createElement spy breaks React)
    globalThis.URL.createObjectURL = vi.fn().mockReturnValue("blob:fake")
    globalThis.URL.revokeObjectURL = vi.fn()

    const { result } = renderHook(() => useExportReport(), {
      wrapper: createWrapper(),
    })

    const origCreateElement = document.createElement.bind(document)
    const mockAnchor = { href: "", download: "", click: vi.fn() } as any
    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      if (tag === "a") return mockAnchor
      return origCreateElement(tag)
    })
    vi.spyOn(document.body, "appendChild").mockImplementation(() => mockAnchor)
    vi.spyOn(document.body, "removeChild").mockImplementation(() => mockAnchor)

    const exportOptions = {
      reportType: "member-engagement" as const,
      format: "csv" as const,
    }

    result.current.mutate(exportOptions)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(exportReportData).toHaveBeenCalledWith(exportOptions)
  })

  it("should handle error when exporting report", async () => {
    const mockError = new Error("Failed to export report")
    vi.mocked(exportReportData).mockRejectedValue(mockError)

    const { result } = renderHook(() => useExportReport(), {
      wrapper: createWrapper(),
    })

    const exportOptions = {
      reportType: "revenue" as const,
      format: "pdf" as const,
    }

    result.current.mutate(exportOptions)

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toEqual(mockError)
  })
})
