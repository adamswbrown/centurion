# Quick Smoke Test Checklist

**Time Required:** ~15 minutes
**Purpose:** Rapid validation that all critical paths work

## Prerequisites
```bash
npx tsx testing/seed-test-data.ts
npm run dev
```

---

## 1. Authentication (2 min)

- [ ] Login as `admin@centurion.test` / `password123`
- [ ] See admin dashboard
- [ ] Logout
- [ ] Login as `client1@centurion.test` / `password123`
- [ ] See client dashboard

---

## 2. Navigation (2 min)

**As ADMIN:**
- [ ] Click through all sidebar links (7 links)
- [ ] No 404 errors
- [ ] Billing page loads (admin-only)

**As CLIENT:**
- [ ] Click through all sidebar links (6 links)
- [ ] No 404 errors
- [ ] Health Data page loads

---

## 3. Core Features (5 min)

### Members
- [ ] Go to `/members` as admin/coach
- [ ] Click on Alice Client
- [ ] Detail page loads

### Appointments
- [ ] Go to `/appointments` as coach
- [ ] See list of appointments
- [ ] Click on one → Detail loads

### Bootcamps
- [ ] Go to `/bootcamps` as coach
- [ ] See bootcamps list
- [ ] Go to `/client/bootcamps` as client
- [ ] See bootcamps list

### Cohorts
- [ ] Go to `/cohorts` as coach
- [ ] Click "Spring 2026 Fitness Challenge"
- [ ] See members (Alice, Bob, Charlie)
- [ ] See coaches (Sarah, Mike)

### Billing
- [ ] Go to `/billing` as admin
- [ ] See invoices and revenue chart

---

## 4. Phase 7 & 8 Features (5 min)

**Login as `client1@centurion.test`**

### Daily Check-Ins
- [ ] Go to `/client/health`
- [ ] See check-in form
- [ ] See history with 14 days of data
- [ ] Submit a new check-in with weight `179.0`
- [ ] Form clears, new entry appears in history

### Questionnaires
- [ ] Go to `/client/questionnaires/1/1` (replace first 1 with actual cohortId from URL bar when viewing cohort)
- [ ] See "Week 1 Questionnaire"
- [ ] See "Questionnaire Locked" (already completed)
- [ ] See previous responses displayed
- [ ] Go to `/client/questionnaires/1/3` (week 3)
- [ ] Not locked (current week)
- [ ] See placeholder for SurveyJS

---

## 5. Access Controls (1 min)

- [ ] As CLIENT, try `/billing` → Redirects away
- [ ] As COACH, try `/billing` → Redirects away
- [ ] As CLIENT, try `/members` → Redirects away
- [ ] Logout, try `/dashboard` → Redirects to login

---

## ✅ Pass Criteria

**Test passes if:**
- All checkboxes can be checked
- No unexpected 404 errors
- No blank/broken pages
- Check-in form works
- Navigation is consistent

**Test fails if:**
- Any 404 on implemented routes
- Check-in form doesn't submit
- History doesn't show data
- Access controls don't redirect correctly

---

**Time to complete:** ~15 minutes
**For comprehensive testing:** See `TEST_PLAN.md`
