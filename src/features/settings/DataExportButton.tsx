"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { exportUserData } from "@/app/actions/gdpr"

export function DataExportButton() {
  const [loading, setLoading] = useState(false)

  async function handleExport() {
    setLoading(true)

    try {
      const result = await exportUserData()

      if (result.error || !result.data) {
        alert(result.error || "Failed to export data")
        return
      }

      // Download as JSON file
      const blob = new Blob([JSON.stringify(result.data, null, 2)], {
        type: "application/json",
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      const date = new Date().toISOString().split("T")[0]
      a.href = url
      a.download = `centurion-data-export-${date}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      alert("An error occurred while exporting your data")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button variant="outline" onClick={handleExport} disabled={loading}>
      {loading ? "Exporting..." : "Export my data"}
    </Button>
  )
}
