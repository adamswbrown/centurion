"use client"

export function TimerLimitations() {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 text-xs text-slate-400">
      <p className="font-medium text-slate-300">PWA limitations</p>
      <ul className="mt-2 list-disc space-y-1 pl-4">
        <li>Timers pause or drift when devices sleep or are backgrounded.</li>
        <li>Wake Lock keeps the screen awake when supported.</li>
        <li>Audio cues may require interaction before playing.</li>
        <li>Notifications are not enabled yet in this build.</li>
      </ul>
    </div>
  )
}
