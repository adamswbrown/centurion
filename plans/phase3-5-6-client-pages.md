# Client Pages Plan (Phase 3, 5, 6)

Date: 2026-01-26
Owner: Codex

## Goals
- Phase 3: Client appointments calendar view (PTP-style) under `/appointments/me`.
- Phase 5: Client cohorts read-only view under `/cohorts/me`.
- Phase 6: Client invoices list/detail under `/invoices/me` with HTML print view + Pay Now button (Stripe link via server action).
- Keep existing `/client/*` routes and add redirects to new `/.../me` routes.

## Interaction Model (PTP-inspired)
- Appointments: calendar grid for the authenticated client with event cards.
- Cohorts: list of memberships with status + dates.
- Invoices: list + detail view, print button for HTML print, pay button uses server action to create Stripe payment link.

## Steps
1) Implement `/appointments/me` calendar view for client; add redirect at `/client/appointments`.
2) Implement `/cohorts/me` read-only list; add redirect at `/client/cohorts`.
3) Implement `/invoices/me` list + detail + print view; add redirect at `/client/invoices`.
4) Add server actions for client invoice payment link creation (Stripe URL).
5) Update WORKLOG.md (tag as Codex work) and STATE.md when complete.
