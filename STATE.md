# Centurion State

Last updated: 2026-01-25 16:20 GMT

## Project Summary
- Unified fitness platform combining Personal Trainer Planner (appointments, bootcamps, invoicing) and CoachFit (cohorts, health data).
- **Phase 4 (Bootcamps) complete**. Ready for Phase 5: Cohort System.

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
- Bootcamp system (Phase 4 ✅):
  - CRUD actions and attendee management with capacity checks.
  - Bootcamp hooks and pages.
  - Bootcamp calendar (month/week), list view, create form, and detail attendee management.
  - Capacity warnings in coach UI (at-capacity alerts, spot count indicators).
  - Client registration flow: `/client/bootcamps` page with browse/register/unregister functionality.
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
- Bootcamp actions: `src/app/actions/bootcamps.ts`, `src/app/actions/client-bootcamps.ts`
- Bootcamp hooks: `src/hooks/useBootcamps.ts`, `src/hooks/useClientBootcamps.ts`
- Bootcamp UI:
  - `src/app/bootcamps/page.tsx` (coach)
  - `src/app/bootcamps/[id]/page.tsx` (coach detail)
  - `src/app/client/bootcamps/page.tsx` (client registration)
  - `src/features/bootcamps/BootcampForm.tsx`
  - `src/features/bootcamps/BootcampList.tsx`
  - `src/features/bootcamps/BootcampCalendar.tsx`
  - `src/features/bootcamps/BootcampDetail.tsx` (with capacity warnings)
  - `src/features/bootcamps/BootcampRegistration.tsx` (client view)
- Calendar utilities: `src/lib/calendar.ts`
- Google Calendar: `src/lib/google-calendar.ts`
- Work log: `WORKLOG.md`

## Data Model Notes
- Prisma Appointment model uses `startTime`, `endTime`, `fee`, `status`, optional `googleEventId`, `invoiceId`.
- Conflict checks enforced on create and update for overlapping sessions per member.
- Bootcamp attendee capacity enforced when adding attendees.

## Environment / Dependencies
- `google-auth-library` + `googleapis` for Calendar sync (lockfile updated).
- React Query provider registered in `src/app/layout.tsx` via `src/app/providers.tsx`.

## Open TODOs
- Consider adding global toast notifications for feedback (currently inline messages).
- Begin Phase 5: Cohort System (cohort CRUD, member management, coach assignment).

## How to Run
- `npm run dev`

## Recent Commits
- `refactor: align members naming and routes`
- `feat: start appointments scheduling backbone`
- `feat: add appointments calendar and detail view`
- `chore: update lockfile after deps install`
- `feat: wire calendar selection and feedback`
