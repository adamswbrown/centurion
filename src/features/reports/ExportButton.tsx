"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useExportReport } from "@/hooks/useReports"
import { Download, FileJson, FileText, Loader2 } from "lucide-react"

/**
 * ExportButton - Export reports in CSV/JSON format
 * Generated with Claude Code
 */

interface ExportButtonProps {
  reportType: "members" | "cohorts" | "revenue" | "compliance"
  label?: string
}

export function ExportButton({ reportType, label }: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false)
  const exportMutation = useExportReport()

  const handleExport = async (format: "csv" | "json") => {
    setIsExporting(true)
    try {
      await exportMutation.mutateAsync({ format, reportType })
    } catch (error) {
      console.error("Export failed:", error)
    } finally {
      setIsExporting(false)
    }
  }

  const reportLabels = {
    members: "Member Report",
    cohorts: "Cohort Report",
    revenue: "Revenue Report",
    compliance: "Compliance Report",
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={isExporting}>
          {isExporting ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          {label || "Export"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{reportLabels[reportType]}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => handleExport("csv")}>
          <FileText className="h-4 w-4 mr-2" />
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport("json")}>
          <FileJson className="h-4 w-4 mr-2" />
          Export as JSON
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// Bulk export all reports
export function ExportAllButton() {
  const [isExporting, setIsExporting] = useState(false)
  const exportMutation = useExportReport()

  const handleExportAll = async (format: "csv" | "json") => {
    setIsExporting(true)
    const reportTypes: Array<"members" | "cohorts" | "revenue" | "compliance"> = [
      "members",
      "cohorts",
      "revenue",
      "compliance",
    ]

    try {
      for (const reportType of reportTypes) {
        await exportMutation.mutateAsync({ format, reportType })
        // Small delay between exports
        await new Promise((resolve) => setTimeout(resolve, 500))
      }
    } catch (error) {
      console.error("Bulk export failed:", error)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="default" disabled={isExporting}>
          {isExporting ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          Export All Reports
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Download all reports</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => handleExportAll("csv")}>
          <FileText className="h-4 w-4 mr-2" />
          All as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExportAll("json")}>
          <FileJson className="h-4 w-4 mr-2" />
          All as JSON
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
