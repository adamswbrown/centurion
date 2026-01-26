"use client"

import { useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { IntervalPreset } from "./types"

function safeParse(value: string): IntervalPreset[] | null {
  try {
    const parsed = JSON.parse(value)
    if (Array.isArray(parsed)) return parsed as IntervalPreset[]
    if (parsed && Array.isArray(parsed.presets)) return parsed.presets as IntervalPreset[]
    return null
  } catch {
    return null
  }
}

export function TimerPresetImportExport({
  presets,
  onImport,
}: {
  presets: IntervalPreset[]
  onImport: (presets: IntervalPreset[], replaceExisting: boolean) => void
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [jsonText, setJsonText] = useState("")
  const [replaceExisting, setReplaceExisting] = useState(false)
  const exportPayload = useMemo(
    () => JSON.stringify({ presets }, null, 2),
    [presets],
  )

  const handleExport = () => {
    const blob = new Blob([exportPayload], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = "centurion-timer-presets.json"
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const handleImportText = () => {
    const parsed = safeParse(jsonText)
    if (!parsed) return
    onImport(parsed, replaceExisting)
    setJsonText("")
  }

  const handleFileImport = async (file: File) => {
    const text = await file.text()
    const parsed = safeParse(text)
    if (!parsed) return
    onImport(parsed, replaceExisting)
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 text-white">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs text-slate-400">Import / Export</p>
          <h3 className="text-lg font-semibold">Presets</h3>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}>
            Export JSON
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
          >
            Import File
          </Button>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
        <input
          id="replaceExisting"
          type="checkbox"
          checked={replaceExisting}
          onChange={() => setReplaceExisting((prev) => !prev)}
        />
        <label htmlFor="replaceExisting">
          Replace existing presets (otherwise merge)
        </label>
      </div>

      <Textarea
        className="mt-3 min-h-[140px] bg-slate-950 text-xs text-slate-200"
        placeholder="Paste presets JSON here..."
        value={jsonText}
        onChange={(event) => setJsonText(event.target.value)}
      />

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={handleImportText}>
          Import JSON
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setJsonText(exportPayload)}
        >
          Load current presets
        </Button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) handleFileImport(file)
          event.currentTarget.value = ""
        }}
      />
    </div>
  )
}
