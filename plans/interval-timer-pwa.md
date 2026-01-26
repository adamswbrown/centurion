# Interval Timer PWA Plan

Date: 2026-01-26 08:32 GMT

## Goal
Rebuild the behavior of wbrawner/interval-timer as a standalone PWA route within Centurion (no code reuse), with local persistence and installable offline support.

## Steps
1) Map interval-timer behaviors to required features (editor, engine, presets, sounds, background/visibility handling).
2) Define `/timer` PWA route + manifest + service worker + local persistence.
3) Implement timer engine + editor UI + presets + offline support.
4) Update WORKLOG/STATE with progress and decisions.

## PWA Timer Limitations + Mitigations (must include)
- **Sleep/background throttling:** Recompute elapsed time from real timestamps (Date.now/performance.now) on resume instead of relying on setInterval tick counts.
- **Visibility changes:** Listen for `visibilitychange` and sync timer state on focus/blur.
- **Screen awake:** Use Wake Lock API when available; provide an explicit “Keep screen awake” toggle and warn when unsupported.
- **Audio reliability:** Use Web Audio beeps for interval cues; allow a **mute** toggle; note that iOS may block audio until user interaction.
- **User guidance:** Document limitations in UI (e.g., accuracy reduced if screen sleeps) and provide tips (keep device awake, enable sound/notifications).
