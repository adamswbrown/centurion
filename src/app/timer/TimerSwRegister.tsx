"use client"

import { useEffect } from "react"

export function TimerSwRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return
    if (!("serviceWorker" in navigator)) return
    navigator.serviceWorker.register("/timer-sw.js").catch(() => {
      // no-op
    })
  }, [])

  return null
}
