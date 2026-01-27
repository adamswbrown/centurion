# CONTINUITY - Session & Cohort Architecture Rework

## Current Phase: DEVELOPMENT
## Current Step: 1 of 15

## PRD Summary
Replacing Centurion's Bootcamp system with unified Session + Cohort model.
3 membership plan types (Recurring, Pack, Prepaid) with Stripe billing.
15-step implementation plan.

## Key Decision
- NextAuth `Session` model conflicts with new `Session` model
- Resolution: New model named `ClassSession` (mapped to `class_sessions` table)
- All code/hooks/actions still use "session" naming externally

## Completed Tasks
- [x] Bootstrap .loki directory
- [x] Read all 3 PRDs (context-pack, session-rework, platform)
- [x] Read current Prisma schema (770 lines, 21+ models)

## In Progress
- Step 1: Schema additions (enums + 6 new models)

## Mistakes & Learnings
(none yet)
