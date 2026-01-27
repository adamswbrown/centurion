Here's the gap analysis between what you've described and what currently exists, organized by severity of change:

Level 1: Conceptual Reframing (No Schema Change, Significant Code Change)
Appointments → Sessions/Classes (the big one)
The current Appointment model is built as a 1-to-1 coach-client relationship. Your vision is a 1-to-many class — like the TeamUp data shows: a "HIIT" or "CORE" class with max_occupancy of 10-15, run by an instructor, that clients browse and register for.

What exists:

Appointment has a single userId (one client) + coachId
No concept of a "class type" or "offering type"
No registration window, no waitlist
Credits are tied to bootcamps, not to session attendance
What's needed:

A ClassType model (e.g. "HIIT", "CORE") with color, description, default capacity
A Session model (replaces or supplements Appointment) — a scheduled instance of a ClassType, with coachId, startTime, endTime, maxOccupancy, venue/location
A SessionRegistration join table (replaces the single userId) — many clients per session
Registration open/close windows, late cancellation cutoff (TeamUp has registrations_open_at, registrations_close_at, late_cancels_after)
Waitlist support (waiting_count, is_full from TeamUp data)
Credits consumed on session registration, not bootcamp registration
Impact: This is a fundamental model change. The entire Appointment model, its server actions, all coach UI (form, calendar, list), all client UI (calendar, detail, cancel), and the hooks layer all need reworking. This is the largest single change.

Level 2: Conceptual Reframing (Schema Exists But Semantics Wrong)
Bootcamp → Cohort Program
You already have two separate models that partially cover this:

Your Vision	Current Bootcamp model	Current Cohort model
Multi-week program (6/8/custom)	Has start/end time	Has start/end date, status
Weekly questionnaires	None	QuestionnaireBundle per week exists
Health data tracking prompts	None	CohortCheckInConfig + Entry exists
Multiple coaches	None	CoachCohortMembership exists
One cohort per user	No constraint	No constraint (client3 is in 2 cohorts in seed)
Coach weekly feedback	None	WeeklyCoachResponse + CoachNote exists
Configurable check-in cadence	None	checkInFrequencyDays exists
The Cohort model already does ~80% of what you want. The Bootcamp model is the wrong abstraction for this — it's a simple event with attendees, no weekly structure.

What's needed:

Delete or repurpose the Bootcamp/BootcampAttendee models entirely
Add a uniqueness constraint so a user can only be in one active cohort
Add a "week number locked after completion" enforcement (already partially there — WeeklyQuestionnaireResponse has @@unique([userId, bundleId]), but no "can't edit after COMPLETED" enforcement at the action level — you'd need to verify this)
Build a client-facing cohort UI that directs users to: (a) enter health data regularly, (b) answer the week's questionnaire at week's end
The coach review workflow (weekly feedback on health data) already has the data model via WeeklyCoachResponse
Impact: Moderate schema cleanup (remove Bootcamp), moderate UI work to build the client cohort experience. The backend models are largely in place.

Level 3: New Feature (Credit ↔ Membership Tiers)
Credits Tied to Membership Type
From your pricing image:

Kickstarter (6-week challenge): 5 SGPT sessions/week — that's 5 credits/week for 6 weeks = 30 total
Committed (6-month): 5 SGPT sessions/week — 5 credits/week recurring
Totally Committed (12-month): 5 SGPT sessions/week — 5 credits/week recurring
What exists:

User.credits (a single integer)
User.creditsExpiry (single expiry date)
CreditTransaction (audit log of credit changes)
Credits are currently consumed by bootcamp registration (1 per bootcamp)
What's needed:

A MembershipPlan model (name, duration, credits-per-week, price, features like "HR Monitor included")
A UserMembership model (user, plan, start date, end date, status, payment reference)
Automated weekly credit allocation based on active membership
Credits consumed when registering for a Session (the new class model), not bootcamps
Credit expiry logic (weekly credits that don't roll over? Or cumulative?)
The current flat credits integer on User might still work as a balance, but the allocation/consumption flow changes completely
Impact: New schema models, new allocation logic (likely a cron job or webhook), rework of credit consumption from bootcamp→session context.

Level 4: UI Build-Out
Client Session Browser
Browse upcoming sessions by type (HIIT, CORE, etc.)
See availability, register/unregister
Credit balance display, cost per session
Calendar view of registered sessions
Late cancellation rules
Client Cohort Dashboard
Current week indicator
Prompt to enter health data (link to existing check-in flow)
Weekly questionnaire access (only current week, locked after submission)
View coach feedback
Coach Session Management
Create/edit class types
Schedule sessions (recurring patterns like "every weekday at 6:30am")
View registrations per session
Mark attendance
Coach Cohort Dashboard
Already partially exists (weekly review queue, coach notes)
Needs the "direct clients to enter health data" nudge mechanism
Summary: Change Severity
Level	Area	Schema Change	Code Change	Effort
1 (Critical)	Appointment → Group Session	New models: ClassType, Session, SessionRegistration	Complete rewrite of appointment actions, UI, hooks	Heavy
2 (Significant)	Bootcamp → Cohort consolidation	Remove Bootcamp/BootcampAttendee, add unique constraint to Cohort	Remove bootcamp UI, build client cohort experience	Medium
3 (Significant)	Membership + Credit rework	New models: MembershipPlan, UserMembership	Credit allocation logic, consumption flow change	Medium
4 (UI)	Client & Coach dashboards	None	New pages and components	Medium-Heavy
The single biggest architectural question: do you keep Appointment for true 1-on-1 sessions alongside the new Session model for group classes, or replace it entirely? The TeamUp data shows everything as schedule_type: "class" with no 1-on-1 appointments, which suggests the platform is group-session-only.