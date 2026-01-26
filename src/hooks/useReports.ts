"use client"

import { useQuery, useMutation } from "@tanstack/react-query"
import {
  getDashboardOverview,
  getMemberEngagementReport,
  getCohortReport,
  getRevenueReport,
  getComplianceReport,
  exportReportData,
  type ReportDateRange,
  type ExportOptions,
} from "@/app/actions/reports"

/**
 * Reports Hooks
 * React Query hooks for reports dashboard
 * Generated with Claude Code
 */

// Dashboard Overview
export function useDashboardOverview() {
  return useQuery({
    queryKey: ["reports", "overview"],
    queryFn: getDashboardOverview,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

// Member Engagement Report
export function useMemberEngagementReport(dateRange?: ReportDateRange) {
  return useQuery({
    queryKey: ["reports", "members", dateRange],
    queryFn: () => getMemberEngagementReport(dateRange),
    staleTime: 1000 * 60 * 5,
  })
}

// Cohort Report
export function useCohortReport() {
  return useQuery({
    queryKey: ["reports", "cohorts"],
    queryFn: getCohortReport,
    staleTime: 1000 * 60 * 5,
  })
}

// Revenue Report
export function useRevenueReport(year?: number) {
  return useQuery({
    queryKey: ["reports", "revenue", year],
    queryFn: () => getRevenueReport(year),
    staleTime: 1000 * 60 * 5,
  })
}

// Compliance Report
export function useComplianceReport() {
  return useQuery({
    queryKey: ["reports", "compliance"],
    queryFn: getComplianceReport,
    staleTime: 1000 * 60 * 5,
  })
}

// Export Report
export function useExportReport() {
  return useMutation({
    mutationFn: (options: ExportOptions) => exportReportData(options),
    onSuccess: (data) => {
      // Trigger download
      const blob = new Blob([data.content], { type: data.contentType })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = data.filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    },
  })
}
