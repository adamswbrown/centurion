# Work Log

## TODO (as of 2026-01-25 13:39 GMT)
- Build appointments calendar view (monthly + weekly) and event cards aligned with personal-trainer-planner UI patterns.
- Add appointment detail/edit view with status updates and conflict re-checks.
- Wire recurring appointments UI with prefill on selected weekday in calendar view.
- Run `npm install` to sync `package-lock.json` with new Google Calendar dependencies.

## 2026-01-25 13:30 GMT
- Initialized work log.

## 2026-01-25 13:32 GMT
- Renamed member-facing UI/components from client terminology and aligned routes to `/members`.
- Updated member actions API naming (get/create/update/delete member) and wired UI to new exports.
- Adjusted navigation and middleware route lists for member naming.

## 2026-01-25 13:39 GMT
- Added appointment backbone (actions, hooks, calendar utils) following personal-trainer-planner patterns.
- Introduced Google Calendar integration module and React Query provider.
- Added initial appointments UI (create form + list page) and supporting UI textarea component.
