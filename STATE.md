# Centurion State

Last updated: 2026-01-25 15:04 GMT

## Project Summary
- Unified fitness platform combining Personal Trainer Planner (appointments, bootcamps, invoicing) and CoachFit (cohorts, health data).
- Current focus: Phase 3 per unified-platform-spec = Appointment System.

## What’s Implemented
- Member management aligned to spec naming (members, not clients): list, detail, create/edit/delete.
- Appointment scheduling backbone:
  - Server actions with conflict detection and Google Calendar sync.
  - React Query hooks for create/update/delete/sync.
  - Calendar utilities for date filters and repeating dates.
- Appointments UI:
  - Create form + list view at `/appointments`.
  - Calendar view (month + week) with event cards.
  - Calendar selection pre-fills appointment date and repeat weekdays.
  - Detail/edit view at `/appointments/[id]` with status updates, inline edits, sync/delete actions.
  - Inline success/error feedback for create/update/sync/delete.
- Google Calendar integration module using service account credentials.

## Key Files
- Spec: `unified-platform-spec.md`
- Member actions: `src/app/actions/members.ts`
- Appointment actions: `src/app/actions/appointments.ts`
- Appointment hooks: `src/hooks/useAppointments.ts`
- Appointment UI:
  - `src/app/appointments/page.tsx`
  - `src/app/appointments/[id]/page.tsx`
  - `src/features/appointments/AppointmentDashboard.tsx`
  - `src/features/appointments/AppointmentForm.tsx`
  - `src/features/appointments/AppointmentList.tsx`
  - `src/features/appointments/AppointmentCalendar.tsx`
  - `src/features/appointments/AppointmentCard.tsx`
  - `src/features/appointments/AppointmentDetail.tsx`
- Calendar utilities: `src/lib/calendar.ts`
- Google Calendar: `src/lib/google-calendar.ts`
- Work log: `WORKLOG.md`

## Data Model Notes
- Prisma Appointment model uses `startTime`, `endTime`, `fee`, `status`, optional `googleEventId`, `invoiceId`.
- Conflict checks enforced on create and update for overlapping sessions per member.

## Environment / Dependencies
- `google-auth-library` + `googleapis` for Calendar sync (lockfile updated).
- React Query provider registered in `src/app/layout.tsx` via `src/app/providers.tsx`.

## Open TODOs
- Consider adding global toast notifications for feedback (currently inline messages).
- Phase 4 next: Bootcamp/group class CRUD + attendee management + calendar integration.

## How to Run
- `npm run dev`

## Recent Commits
- `refactor: align members naming and routes`
- `feat: start appointments scheduling backbone`
- `feat: add appointments calendar and detail view`
- `chore: update lockfile after deps install`
- `feat: wire calendar selection and feedback`
