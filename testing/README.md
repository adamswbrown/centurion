# Testing Documentation

This folder contains all testing resources for the Centurion platform.

## Quick Start

### 1. Seed Test Data

```bash
npx tsx testing/seed-test-data.ts
```

This creates:
- 1 Admin, 2 Coaches, 4 Clients
- 3 Cohorts with memberships
- 14 days of check-in data for active clients
- 3 weeks of questionnaire bundles
- Completed questionnaire responses
- Sample appointments, bootcamps, and invoices

### 2. Run Development Server

```bash
npm run dev
```

### 3. Follow Test Plan

Open `TEST_PLAN.md` and work through each section systematically.

## Test Accounts

**All passwords:** `password123`

| Role | Email | Notes |
|------|-------|-------|
| ADMIN | admin@centurion.test | Full access including billing |
| COACH | coach@centurion.test | Sarah Coach - assigned to active cohort |
| COACH | coach2@centurion.test | Mike Coach - multi-coach setup |
| CLIENT | client1@centurion.test | Alice - 14 days check-ins, completed questionnaires |
| CLIENT | client2@centurion.test | Bob - Sporadic check-ins (every 3 days) |
| CLIENT | client3@centurion.test | Charlie - PAUSED status |
| CLIENT | client4@centurion.test | Diana - New, no data yet |

## Files

- **`seed-test-data.ts`** - Database seeding script
- **`TEST_PLAN.md`** - Comprehensive testing checklist (MAIN DOCUMENT)
- **`QUICK_TEST.md`** - Abbreviated smoke test checklist
- **`README.md`** - This file

## Testing Phases Covered

- ✅ Phase 1: Foundation (Auth, Layout)
- ✅ Phase 2: Navigation
- ✅ Phase 3: Member Management
- ✅ Phase 4: Appointments & Scheduling
- ✅ Phase 5: Bootcamps
- ✅ Phase 6: Cohorts
- ✅ Phase 7: Invoicing & Billing
- ✅ **Phase 8: Daily Check-Ins** (NEW)
- ✅ **Phase 9: Weekly Questionnaires** (NEW)

## Known Limitations

### Not Yet Implemented
- Full SurveyJS integration (questionnaires show placeholder)
- Coach analytics views for member health data
- Reports dashboard
- User management admin page
- Settings pages (placeholders only)

### These Are Expected
These pages intentionally return 404 (not in scope for Phase 1-8):
- `/admin/users`
- `/reports`
- `/settings`
- `/client/settings`

## Reporting Issues

When you find a bug:
1. **URL:** Where did it happen?
2. **User:** Which test account were you using?
3. **Steps:** How can we reproduce it?
4. **Expected:** What should have happened?
5. **Actual:** What actually happened?
6. **Console:** Any errors in browser dev tools console?

## Re-seeding Database

If you need to reset test data:

```bash
# Clear all data and re-seed
npx tsx testing/seed-test-data.ts
```

The script automatically clears existing test data before seeding.

## Success Criteria

**Testing is complete when:**
- All sections in TEST_PLAN.md have checkmarks
- No unexpected 404 errors
- All CRUD operations work
- All role-based access controls enforced
- Check-ins submit and display correctly
- Questionnaire week locking works
- Navigation has no broken links

---

**Need Help?** Review the detailed TEST_PLAN.md for step-by-step instructions.
