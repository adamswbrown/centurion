# Centurion Testing Plan
## Comprehensive Validation Through Phase 7 & 8

**Last Updated:** 2026-01-26
**Test Data Seeded:** Yes
**Build Status:** ✅ Passing

---

## Prerequisites

### 1. Run Test Data Seed

Before testing, populate the database with realistic test data:

```bash
# Install ts-node and tsx if not already installed
npm install -D tsx

# Run the seed script
npx tsx testing/seed-test-data.ts
```

**Expected Output:**
- ✅ Users created (Admin, 2 Coaches, 4 Clients)
- ✅ Cohorts created (Active, Upcoming, Completed)
- ✅ Check-in entries created (14 days for active clients)
- ✅ Questionnaire bundles and responses created
- ✅ Appointments, bootcamps, and invoices created

### 2. Start Development Server

```bash
npm run dev
```

Server will run on [http://localhost:3000](http://localhost:3000)

---

## Test Accounts

### Admin Account
- **Email:** `admin@centurion.test`
- **Password:** `password123`
- **Access:** Full system access, billing, all management features

### Coach Accounts
- **Email:** `coach@centurion.test` (Sarah Coach)
- **Password:** `password123`
- **Access:** Members, appointments, bootcamps, cohorts, invoices (view only)

- **Email:** `coach2@centurion.test` (Mike Coach)
- **Password:** `password123`
- **Access:** Same as coach 1

### Client Accounts
- **Email:** `client1@centurion.test` (Alice Client)
- **Password:** `password123`
- **Status:** Active in cohort, 14 days of check-ins, completed questionnaires

- **Email:** `client2@centurion.test` (Bob Client)
- **Password:** `password123`
- **Status:** Active in cohort, sporadic check-ins (every 3 days)

- **Email:** `client3@centurion.test` (Charlie Client)
- **Password:** `password123`
- **Status:** PAUSED in active cohort, also in upcoming cohort

- **Email:** `client4@centurion.test` (Diana Client)
- **Password:** `password123`
- **Status:** Only in upcoming cohort, no check-ins

---

## Testing Checklist

### Phase 1: Authentication & Authorization

#### Test 1.1: Login Flow
- [ ] Navigate to `/login`
- [ ] Enter invalid credentials → Should show error
- [ ] Enter valid admin credentials → Should redirect to `/dashboard`
- [ ] Logout → Should redirect to `/login`
- [ ] Login as coach → Should redirect to `/dashboard`
- [ ] Login as client → Should redirect to `/client/dashboard`

#### Test 1.2: Route Protection
- [ ] Try accessing `/dashboard` when logged out → Should redirect to `/login`
- [ ] As CLIENT, try accessing `/members` → Should redirect to `/client/dashboard`
- [ ] As CLIENT, try accessing `/billing` → Should redirect to `/client/dashboard`
- [ ] As COACH, try accessing `/billing` → Should redirect to `/dashboard`
- [ ] As ADMIN, access `/billing` → Should load successfully

---

### Phase 2: Layout & Navigation

#### Test 2.1: Sidebar Navigation (Desktop)
**As ADMIN:**
- [ ] Dashboard link present
- [ ] Members link present
- [ ] Appointments link present
- [ ] Bootcamps link present
- [ ] Cohorts link present
- [ ] **Billing** link present (not "Invoices")
- [ ] Timer link present
- [ ] No broken/404 links

**As COACH:**
- [ ] Dashboard link present
- [ ] Invoices link points to `/invoices/me`
- [ ] No Billing link (admin-only)
- [ ] All other links present

**As CLIENT:**
- [ ] Dashboard, My Appointments, My Bootcamps, My Cohorts present
- [ ] **Health Data** link present
- [ ] Invoices link present
- [ ] No broken/404 links

#### Test 2.2: Mobile Navigation
- [ ] Resize browser to mobile width
- [ ] Hamburger menu appears
- [ ] Click menu → Drawer opens
- [ ] All nav items present
- [ ] Click link → Drawer closes, navigates correctly

---

### Phase 3: Member Management (ADMIN/COACH)

**Login as:** `coach@centurion.test`

#### Test 3.1: Member List
- [ ] Navigate to `/members`
- [ ] Page loads without errors
- [ ] See list of 4 clients
- [ ] Click on Alice Client → Loads detail page

#### Test 3.2: Member Detail
- [ ] View appointments list for Alice
- [ ] View cohort memberships
- [ ] Back to members list works

**Login as:** `admin@centurion.test`

#### Test 3.3: Create Member
- [ ] Navigate to `/members`
- [ ] Click "New Member" or create button
- [ ] Fill in form with test data
- [ ] Submit → New member appears in list

#### Test 3.4: Edit Member
- [ ] Click on a member
- [ ] Edit name/email
- [ ] Save → Changes persist

---

### Phase 4: Appointments (COACH)

**Login as:** `coach@centurion.test`

#### Test 4.1: Appointment List
- [ ] Navigate to `/appointments`
- [ ] See list of appointments
- [ ] See both past (ATTENDED) and future (SCHEDULED) appointments

#### Test 4.2: Create Appointment
- [ ] Click "New Appointment"
- [ ] Select Alice Client
- [ ] Set date/time in the future
- [ ] Set fee ($75)
- [ ] Submit → Appointment appears in list

#### Test 4.3: Appointment Detail
- [ ] Click on an appointment
- [ ] View full details
- [ ] Update status to ATTENDED
- [ ] Changes save successfully

#### Test 4.4: Conflict Detection
- [ ] Try creating two appointments for same client at same time
- [ ] Should show error about conflict

---

### Phase 5: Bootcamps (COACH)

**Login as:** `coach@centurion.test`

#### Test 5.1: Bootcamp List
- [ ] Navigate to `/bootcamps`
- [ ] See "Morning HIIT" and "Strength & Conditioning"
- [ ] See attendee counts

#### Test 5.2: Bootcamp Detail
- [ ] Click on "Morning HIIT"
- [ ] See list of 3 registered attendees
- [ ] Capacity shows 3/20

#### Test 5.3: Add Attendee
- [ ] In bootcamp detail, add Diana Client
- [ ] Attendee count increases
- [ ] Diana appears in list

#### Test 5.4: Remove Attendee
- [ ] Remove an attendee
- [ ] Count decreases
- [ ] Attendee removed from list

**Login as:** `client1@centurion.test`

#### Test 5.5: Client Bootcamp Registration
- [ ] Navigate to `/client/bootcamps`
- [ ] See available bootcamps
- [ ] Register for a bootcamp
- [ ] Unregister from a bootcamp
- [ ] Both actions work correctly

---

### Phase 6: Cohorts (COACH)

**Login as:** `coach@centurion.test`

#### Test 6.1: Cohort List
- [ ] Navigate to `/cohorts`
- [ ] See 3 cohorts (Spring 2026, Summer 2026, Winter 2025)
- [ ] See status badges (ACTIVE, COMPLETED)
- [ ] See member/coach counts

#### Test 6.2: Cohort Detail
- [ ] Click on "Spring 2026 Fitness Challenge"
- [ ] See cohort details (name, description, dates)
- [ ] See status badge (ACTIVE)

#### Test 6.3: Inline Editing
- [ ] Edit cohort description (click, type, blur)
- [ ] Success message appears
- [ ] Refresh → Changes persist

#### Test 6.4: Coach Assignment
- [ ] See both Sarah Coach and Mike Coach assigned
- [ ] Remove Mike Coach
- [ ] Add Mike Coach back
- [ ] Both operations work

#### Test 6.5: Member Management
- [ ] See 3 members (Alice ACTIVE, Bob ACTIVE, Charlie PAUSED)
- [ ] Change Bob's status to PAUSED
- [ ] Success message shows
- [ ] Status badge updates

#### Test 6.6: Add Member to Cohort
- [ ] Click "Add Member"
- [ ] Select Diana Client from dropdown
- [ ] Submit → Diana appears in member list

#### Test 6.7: Status Transitions
- [ ] Click "Mark as Completed"
- [ ] Status changes to COMPLETED
- [ ] "Archive" button now appears
- [ ] Click "Archive" → Status changes to ARCHIVED

**Login as:** `client1@centurion.test`

#### Test 6.8: Client Cohort View
- [ ] Navigate to `/client/cohorts`
- [ ] See "Spring 2026 Fitness Challenge"
- [ ] View is read-only (no edit buttons)
- [ ] Can see own membership status

---

### Phase 7: Invoicing & Billing (ADMIN)

**Login as:** `admin@centurion.test`

#### Test 7.1: Billing Dashboard
- [ ] Navigate to `/billing`
- [ ] Page loads without errors
- [ ] See revenue chart
- [ ] See invoice list

#### Test 7.2: Invoice List
- [ ] See 2 invoices for Alice Client
- [ ] One UNPAID ($225), one PAID ($150)
- [ ] Status badges display correctly

#### Test 7.3: Generate Invoice
- [ ] Click "Generate Invoice"
- [ ] Select Alice Client
- [ ] Select month
- [ ] Submit → New invoice created
- [ ] Attended appointments linked

#### Test 7.4: Invoice Detail
- [ ] Click on UNPAID invoice
- [ ] See appointment breakdown
- [ ] See total amount
- [ ] Payment link present

#### Test 7.5: Payment Status Update
- [ ] Change status to PAID
- [ ] paidAt timestamp populates
- [ ] Status badge updates

**Login as:** `coach@centurion.test`

#### Test 7.6: Coach Invoice Access
- [ ] Navigate to `/invoices/me`
- [ ] Should see read-only list (if coach has any)
- [ ] Cannot access `/billing` (admin-only)

**Login as:** `client1@centurion.test`

#### Test 7.7: Client Invoice View
- [ ] Navigate to `/client/invoices`
- [ ] See own invoices only
- [ ] Click payment link (doesn't actually charge in test)
- [ ] Can view invoice detail at `/invoices/me/[id]`

---

### Phase 8: Daily Check-Ins (CLIENT) **NEW**

**Login as:** `client1@centurion.test`

#### Test 8.1: Health Data Page
- [ ] Navigate to `/client/health`
- [ ] Page loads without errors
- [ ] See "Daily Check-In" heading
- [ ] Check-in form is visible

#### Test 8.2: Submit Check-In Form
- [ ] Fill in weight: `179.5`
- [ ] Fill in steps: `10500`
- [ ] Fill in calories: `2100`
- [ ] Fill in sleep quality: `8`
- [ ] Fill in perceived stress: `4`
- [ ] Fill in notes: `Great workout today!`
- [ ] Click "Submit Check-In"
- [ ] Success → Form clears
- [ ] New entry appears in history table below

#### Test 8.3: Check-In History
- [ ] Scroll down to "Check-In History" section
- [ ] See table with past 30 entries
- [ ] See Alice's 14 days of data
- [ ] Data shows: dates, weight trend, steps, calories, sleep, stress, notes
- [ ] Most recent entry appears first (descending order)

#### Test 8.4: Partial Data Entry
- [ ] Submit a new check-in with only weight and steps (leave others blank)
- [ ] Form accepts partial data
- [ ] Entry appears with "—" for missing fields

**Login as:** `client2@centurion.test`

#### Test 8.5: Sporadic Check-Ins
- [ ] Navigate to `/client/health`
- [ ] See Bob's sporadic entries (every 3 days)
- [ ] History shows gaps in dates
- [ ] Can submit today's check-in

**Login as:** `client4@centurion.test`

#### Test 8.6: No Data Yet
- [ ] Navigate to `/client/health`
- [ ] Form is empty
- [ ] History shows "No check-ins recorded yet"
- [ ] Submit first check-in → Appears immediately

**As COACH** (Future Enhancement - Not Required for Current Phase):
- Note: Coach views of member check-in data not yet implemented
- This will be added in Phase 9: Health Data Tracking

---

### Phase 9: Weekly Questionnaires (CLIENT) **NEW**

**Login as:** `client1@centurion.test`

#### Test 9.1: Access Questionnaire
- [ ] Navigate to cohort detail at `/cohorts/me` (redirects from `/client/cohorts`)
- [ ] Click on "Spring 2026 Fitness Challenge"
- [ ] (Note: Direct questionnaire navigation requires manual URL for now)
- [ ] Go to `/client/questionnaires/[cohortId]/1` (replace [cohortId] with actual ID)

#### Test 9.2: View Questionnaire (Week 1 - Completed)
- [ ] Page loads without errors
- [ ] See "Week 1 Questionnaire" heading
- [ ] See "Questionnaire Locked" banner (already completed)
- [ ] See previous responses displayed
- [ ] Cannot edit (read-only mode)
- [ ] See submission timestamp

#### Test 9.3: View Questionnaire (Week 3 - Current Week)
- [ ] Navigate to `/client/questionnaires/[cohortId]/3`
- [ ] No locked banner (current week is editable)
- [ ] See SurveyJS integration placeholder message
- [ ] "Save Progress" and "Submit Questionnaire" buttons visible
- [ ] Note: Full SurveyJS integration pending

#### Test 9.4: Week Availability Check
- [ ] Try accessing week 4: `/client/questionnaires/[cohortId]/4`
- [ ] Should show "Questionnaire not available yet"
- [ ] Shows current week number
- [ ] Cannot submit responses for future weeks

#### Test 9.5: Past Week Lock
- [ ] Try accessing week 1 again
- [ ] Cannot edit (week has passed)
- [ ] Shows as read-only

**Login as:** `client2@centurion.test`

#### Test 9.6: Incomplete Responses
- [ ] Navigate to `/client/questionnaires/[cohortId]/2`
- [ ] Bob didn't complete week 2
- [ ] Week 2 is now past (cannot submit)
- [ ] Shows "Questionnaire is locked for past weeks"

**Login as:** `coach@centurion.test`

#### Test 9.7: Coach View of Responses (If Implemented)
- [ ] Navigate to cohort detail
- [ ] (Note: Coach questionnaire response views not yet in UI)
- [ ] This is a future enhancement

---

### Phase 10: Timer PWA [IGNORE THIS STEP FOR NOW]

**Login as any user**

#### Test 10.1: Timer Access
- [ ] Navigate to `/timer`
- [ ] Timer interface loads
- [ ] Preset editor visible
- [ ] Can start/stop timer
- [ ] Works as standalone feature

---

## Data Validation Tests

### Check-In Data Integrity

**Login as:** `admin@centurion.test`

#### Verify in Database (Optional - Advanced)
```sql
-- Check entry counts
SELECT userId, COUNT(*) as entry_count
FROM Entry
GROUP BY userId;

-- Expected: Alice (client1) has 14 entries
-- Expected: Bob (client2) has 5 entries (every 3 days for 14 days)

-- Check unique constraint (one entry per user per day)
SELECT userId, date, COUNT(*)
FROM Entry
GROUP BY userId, date
HAVING COUNT(*) > 1;

-- Expected: No results (constraint working)
```

### Questionnaire Data Integrity

```sql
-- Check questionnaire bundles
SELECT cohortId, weekNumber, COUNT(*)
FROM QuestionnaireBundle
GROUP BY cohortId, weekNumber
HAVING COUNT(*) > 1;

-- Expected: No duplicates

-- Check response statuses
SELECT status, COUNT(*)
FROM WeeklyQuestionnaireResponse;

-- Expected: All responses have valid status (IN_PROGRESS or COMPLETED)
```

---

## Error Handling Tests

### Test 404 Prevention
- [ ] Navigate to `/admin/users` → Should 404 (page doesn't exist) - **EXPECTED**
- [ ] Navigate to `/reports` → Should 404 (page doesn't exist) - **EXPECTED**
- [ ] Navigate to `/settings` → Should 404 (page doesn't exist) - **EXPECTED**
- [ ] Navigate to `/members/999999` → Should 404 or error (invalid ID)

### Test Unauthorized Access
- [ ] As CLIENT, try `/dashboard` → Redirect to `/client/dashboard`
- [ ] As COACH, try `/billing` → Redirect to `/dashboard`
- [ ] When logged out, try `/appointments` → Redirect to `/login`

### Test Form Validation
- [ ] Try creating appointment without selecting member → Should show error
- [ ] Try creating cohort with end date before start date → Should show error
- [ ] Try adding duplicate member to cohort → Should show error
- [ ] Try submitting check-in with sleep quality = 15 → Should reject (max 10)

---

## Performance Tests

### Page Load Times
- [ ] Dashboard loads in < 2 seconds
- [ ] Member list loads in < 2 seconds
- [ ] Cohort detail loads in < 2 seconds
- [ ] Check-in history loads in < 2 seconds

### Data Fetching
- [ ] React Query caching works (navigate away and back → no re-fetch)
- [ ] Mutations invalidate caches correctly (create entry → history updates)

---

## Regression Tests

### Phase 1-6 Functionality
- [ ] Member CRUD still works
- [ ] Appointment scheduling still works
- [ ] Bootcamp registration still works
- [ ] Cohort management still works
- [ ] Invoice generation still works
- [ ] Calendar integration still works (if configured)

---

## Known Issues / Future Enhancements

### Not Implemented (Expected)
1. `/admin/users` - User management page (not in Phase 1-8)
2. `/reports` - Reporting dashboard (not in Phase 1-8)
3. `/settings` - Settings page (placeholder only)
4. Full SurveyJS integration for questionnaires (placeholder currently)
5. Coach analytics views for member check-in data
6. Coach views for questionnaire responses

### Edge Cases to Test Later
1. What happens when cohort has no startDate?
2. What happens when member tries to submit check-in for future date?
3. What happens when questionnaire bundle has no questions JSON?

---

## Success Criteria

**All tests pass** when:
- ✅ No 404 errors for implemented routes
- ✅ All role-based access controls work correctly
- ✅ Data persists correctly after all CRUD operations
- ✅ Check-in form submits and displays in history
- ✅ Questionnaire week locking works (past/future/current)
- ✅ Navigation is consistent across roles
- ✅ No broken links in sidebar/mobile nav
- ✅ TypeScript build passes
- ✅ All Phase 1-8 features still functional

---

## Reporting Issues

If you find bugs during testing:
1. Note the URL where the error occurred
2. Note the user role you were logged in as
3. Note the exact steps to reproduce
4. Check browser console for error messages
5. Report to development team with full context

---

**Testing Status:** ⏳ In Progress
**Last Test Run:** [Date]
**Tester:** [Your Name]
**Issues Found:** [Number]
