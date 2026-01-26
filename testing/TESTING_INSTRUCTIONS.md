# Testing Instructions for Centurion

## 🎯 What I Need You To Test

I've completed comprehensive validation and fixes for all functionality through Phase 7 & 8. Now I need you to run through the testing plan to verify everything works in the UI.

---

## ✅ Issues Fixed

### 1. **Middleware Route Protection**
   - **Problem:** `/cohorts` and `/billing` were not in the middleware's protected route list
   - **Fix:** Added `/cohorts` to coach routes, `/billing` to admin routes
   - **Impact:** Proper access control now enforced

### 2. **Navigation Consistency**
   - **Problem:** Sidebar showed non-existent routes (/admin/users, /reports, /settings)
   - **Fix:** Removed broken links, updated "Invoices" to "Billing" for admin, coaches now use `/invoices/me`
   - **Impact:** No more 404s from navigation

### 3. **Test Data Scaffolding**
   - **Created:** Comprehensive seed script with realistic data
   - **Includes:** 3 roles × multiple users, cohorts with members, 14 days of check-ins, questionnaires, appointments, bootcamps, invoices
   - **Purpose:** Enables full UI testing without manual data creation

---

## 🚀 Step-by-Step: What You Need To Do

### Step 1: Seed the Database (5 minutes)

Run this command in your terminal:

```bash
npx tsx testing/seed-test-data.ts
```

**You should see:**
```
🌱 Starting seed...
🧹 Clearing existing test data...
👤 Creating users...
✅ Created 7 users
🎯 Creating cohorts...
✅ Created 3 cohorts
👨‍🏫 Assigning coaches to cohorts...
👥 Assigning members to cohorts...
📋 Creating check-in configs...
📊 Creating daily check-in entries...
✅ Created 19 check-in entries
📝 Creating questionnaire bundles...
✅ Created 3 questionnaire bundles
💬 Creating questionnaire responses...
✅ Created questionnaire responses
📅 Creating appointments...
✅ Created 7 appointments
💪 Creating bootcamps...
✅ Created 2 bootcamps with attendees
💵 Creating invoices...
✅ Created 2 invoices

✨ Seed completed successfully!
```

**If you see errors:**
- Make sure your PostgreSQL database is running
- Check that your `.env.local` has the correct `DATABASE_URL`
- Run `npm run db:generate` to update Prisma client

### Step 2: Start the Server

```bash
npm run dev
```

Server starts on [http://localhost:3000](http://localhost:3000)

### Step 3: Choose Your Testing Approach

#### Option A: Quick Smoke Test (15 minutes) ⚡
**Best for:** Rapid validation that nothing is broken

Open `testing/QUICK_TEST.md` and work through the checklist.

**You'll test:**
- Login for all roles
- Navigation (no 404s)
- Core features (members, appointments, bootcamps, cohorts, billing)
- **NEW: Daily check-ins**
- **NEW: Weekly questionnaires**
- Access controls

#### Option B: Comprehensive Test (1-2 hours) 🔍
**Best for:** Thorough validation of all features

Open `testing/TEST_PLAN.md` and work through each section systematically.

**You'll test:**
- Everything in Quick Test, plus...
- CRUD operations for all entities
- Inline editing
- Form validation
- Error handling
- Data integrity
- Performance

### Step 4: Report Findings

As you test, check off items in the markdown files.

**If you find issues:**
1. Note the URL where it occurred
2. Note which test account you were using
3. Note the exact steps to reproduce
4. Check browser console (F12) for errors
5. Tell me what happened vs. what you expected

**If everything works:**
Just confirm which test plan you completed (Quick or Comprehensive) and that all items passed.

---

## 📋 Test Accounts Reference

**ALL PASSWORDS:** `password123`

### Admin (Full Access)
- **Email:** `admin@centurion.test`
- **Can Access:** Everything including `/billing`

### Coaches (Manage Members & Programs)
- **Email:** `coach@centurion.test` (Sarah Coach)
- **Email:** `coach2@centurion.test` (Mike Coach)
- **Can Access:** Dashboard, Members, Appointments, Bootcamps, Cohorts, Timer
- **Cannot Access:** Billing (admin-only)

### Clients (Self-Service)
- **Email:** `client1@centurion.test` (Alice)
  - **Has:** 14 days of check-in data, completed questionnaires, appointments, bootcamp registrations
  - **Best for:** Testing check-in history and questionnaire responses

- **Email:** `client2@centurion.test` (Bob)
  - **Has:** Sporadic check-ins (every 3 days), incomplete questionnaires
  - **Best for:** Testing gaps in data

- **Email:** `client3@centurion.test` (Charlie)
  - **Status:** PAUSED in active cohort
  - **Best for:** Testing member status changes

- **Email:** `client4@centurion.test` (Diana)
  - **Status:** New member, no data yet
  - **Best for:** Testing first-time submissions

---

## 🎯 Critical Test Areas for Phase 7 & 8

### Daily Check-Ins (Phase 7)

**As `client1@centurion.test`:**

1. Go to `/client/health`
2. **Verify:** Page loads, form visible, history table shows 14 days
3. **Action:** Fill in new check-in (weight: 179, steps: 10000, etc.)
4. **Action:** Click "Submit Check-In"
5. **Verify:** Form clears, new entry appears at top of history
6. **Verify:** Can submit with partial data (only weight & steps)

**Expected to see:**
- Check-in form with 7 fields (weight, steps, calories, sleep, stress, notes, date)
- History table with columns: Date, Weight, Steps, Calories, Sleep, Stress, Notes
- Data sorted newest first
- "—" for missing values

### Weekly Questionnaires (Phase 8)

**As `client1@centurion.test`:**

**Finding the cohort ID:**
1. Go to `/cohorts/me` (or `/client/cohorts` which redirects)
2. You'll see the cohort detail page
3. Look at the URL bar - it will show `/cohorts/[number]`
4. Copy that number (this is your cohortId)

**Testing questionnaires:**
1. Go to `/client/questionnaires/[cohortId]/1` (replace [cohortId] with the number you copied)
2. **Verify:** Shows "Week 1 Questionnaire"
3. **Verify:** See "Questionnaire Locked" banner (already completed by Alice)
4. **Verify:** Previous responses displayed
5. **Verify:** Cannot edit (read-only)

6. Go to `/client/questionnaires/[cohortId]/3`
7. **Verify:** Week 3 is current week (not locked)
8. **Verify:** See SurveyJS placeholder message
9. **Verify:** "Save Progress" and "Submit" buttons visible

10. Go to `/client/questionnaires/[cohortId]/4`
11. **Verify:** Shows "Questionnaire not available yet" (future week)

**Expected behavior:**
- Week 1: Locked (completed in the past)
- Week 2: Locked (past week)
- Week 3: Editable (current week, started 2 weeks ago = week 3 now)
- Week 4+: Not available yet (future)

**Note:** Full SurveyJS integration is pending. Current implementation shows structure and locking logic.

---

## ❓ What If Something Doesn't Work?

### Common Issues

**"Cannot find cohortId"**
- The seed script creates cohorts with auto-increment IDs
- Check `/cohorts` as a coach to see the ID
- Or use `/cohorts/me` as a client to navigate to your cohort

**"No check-in data showing"**
- Make sure you're logged in as `client1@centurion.test`
- Check the browser console for errors
- Verify seed script ran successfully

**"404 on /client/questionnaires"**
- This route requires both cohortId and weekNumber parameters
- Use the format: `/client/questionnaires/1/1` (adjust numbers)
- Navigate via cohort detail pages

**"Page is blank"**
- Open browser console (F12)
- Look for error messages
- Report the full error stack to me

### Expected 404s (Not Bugs)

These pages intentionally don't exist (not in Phase 1-8 scope):
- `/admin/users` - User management (future)
- `/reports` - Reporting dashboard (future)
- `/settings` - Settings (placeholder only)

---

## 📊 What Success Looks Like

**You should be able to:**
- ✅ Login as all 3 roles without errors
- ✅ Navigate through all sidebar links with no 404s
- ✅ View members, appointments, bootcamps, cohorts, invoices
- ✅ Submit a daily check-in and see it appear in history
- ✅ View locked questionnaires (week 1) and current questionnaire (week 3)
- ✅ See proper access control (clients can't access billing, etc.)

**TypeScript Build Status:** ✅ Passing (verified before providing to you)

---

## 📞 Ready to Report Results

After testing, let me know:

1. **Which test plan did you use?** (Quick or Comprehensive)
2. **Overall result:** All passed / X items failed
3. **Any issues found:** List them with URLs and steps to reproduce
4. **Browser used:** Chrome/Firefox/Safari/Edge
5. **Any unexpected behavior:** Even if not blocking

---

**Start here:** Run the seed script, start the server, open `QUICK_TEST.md`

**Questions?** Check `README.md` in this folder or ask me!
