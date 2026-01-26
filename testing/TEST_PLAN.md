# Centurion Comprehensive Test Plan
## Full End-to-End UI & Functionality Testing

**Last Updated:** 2026-01-26
**Platform Version:** All Phases Complete (1-12 + Batches 1-4)
**Total Test Cases:** 250+
**Build Status:** Passing (39 routes)

---

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Test Accounts](#test-accounts)
3. [Authentication & Authorization](#1-authentication--authorization)
4. [Navigation & Layout](#2-navigation--layout)
5. [Dashboard](#3-dashboard)
6. [Member Management](#4-member-management)
7. [Admin User Management](#5-admin-user-management)
8. [Appointments](#6-appointments)
9. [Client Appointments](#7-client-appointments)
10. [Bootcamps](#8-bootcamps)
11. [Cohorts](#9-cohorts)
12. [Daily Check-Ins](#10-daily-check-ins)
13. [Weekly Questionnaires](#11-weekly-questionnaires)
14. [Questionnaire Builder (Admin)](#12-questionnaire-builder-admin)
15. [Invoicing & Billing](#13-invoicing--billing)
16. [Reports Dashboard](#14-reports-dashboard)
17. [Coach Review Queue](#15-coach-review-queue)
18. [Settings](#16-settings)
19. [HealthKit Integration](#17-healthkit-integration)
20. [Credit Management](#18-credit-management)
21. [Email Notifications](#19-email-notifications)
22. [Error Handling & Loading States](#20-error-handling--loading-states)
23. [Timer PWA](#21-timer-pwa)
24. [Accessibility](#22-accessibility)
25. [Performance](#23-performance)

---

## Prerequisites

### 1. Database Setup

```bash
# Run Prisma migrations
npx prisma migrate dev

# Generate Prisma client
npx prisma generate
```

### 2. Seed Test Data

```bash
# Install tsx if needed
npm install -D tsx

# Run seed script
npx tsx testing/seed-test-data.ts
```

**Expected Output:**
- 7 Users (1 Admin, 2 Coaches, 4 Clients)
- 3 Cohorts (Active, Upcoming, Completed)
- 14 days of check-in entries for active clients
- 6 weeks of questionnaire bundles with templates
- Appointments, bootcamps, and invoices

### 3. Environment Variables

Ensure `.env` has:
```
DATABASE_URL=...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=http://localhost:3000
# Optional for full testing:
RESEND_API_KEY=...
STRIPE_SECRET_KEY=...
GOOGLE_CALENDAR_CREDENTIALS=...
```

### 4. Start Server

```bash
npm run dev
```

Server: [http://localhost:3000](http://localhost:3000)

---

## Test Accounts

| Role | Email | Password | Access Level |
|------|-------|----------|--------------|
| **Admin** | admin@centurion.test | password123 | Full system access |
| **Coach 1** | coach@centurion.test | password123 | Members, appointments, cohorts, review queue |
| **Coach 2** | coach2@centurion.test | password123 | Same as Coach 1 |
| **Client 1** | client1@centurion.test | password123 | Active, 14 days check-ins, completed questionnaires |
| **Client 2** | client2@centurion.test | password123 | Active, sporadic check-ins |
| **Client 3** | client3@centurion.test | password123 | PAUSED status |
| **Client 4** | client4@centurion.test | password123 | Upcoming cohort only |

---

## 1. Authentication & Authorization

### 1.1 Login Flow
| # | Test Case | Steps | Expected Result | Pass |
|---|-----------|-------|-----------------|------|
| 1.1.1 | Invalid login | Enter wrong password | Error message displayed | [ ] |
| 1.1.2 | Invalid email | Enter non-existent email | Error message displayed | [ ] |
| 1.1.3 | Admin login | Login as admin@centurion.test | Redirect to /dashboard | [ ] |
| 1.1.4 | Coach login | Login as coach@centurion.test | Redirect to /dashboard | [ ] |
| 1.1.5 | Client login | Login as client1@centurion.test | Redirect to /client/dashboard | [ ] |
| 1.1.6 | Logout | Click logout button | Redirect to /login, session cleared | [ ] |
| 1.1.7 | Session persistence | Refresh page while logged in | Stay logged in | [ ] |

### 1.2 Route Protection
| # | Test Case | Steps | Expected Result | Pass |
|---|-----------|-------|-----------------|------|
| 1.2.1 | Unauthenticated access | Visit /dashboard while logged out | Redirect to /login | [ ] |
| 1.2.2 | Client blocked from admin | As CLIENT, visit /members | Redirect to /client/dashboard | [ ] |
| 1.2.3 | Client blocked from billing | As CLIENT, visit /billing | Redirect to /client/dashboard | [ ] |
| 1.2.4 | Coach blocked from billing | As COACH, visit /billing | Redirect to /dashboard | [ ] |
| 1.2.5 | Coach blocked from admin users | As COACH, visit /admin/users | Redirect to /dashboard | [ ] |
| 1.2.6 | Admin full access | As ADMIN, visit /billing | Page loads | [ ] |
| 1.2.7 | Admin user management | As ADMIN, visit /admin/users | Page loads | [ ] |

---

## 2. Navigation & Layout

### 2.1 Sidebar Navigation (Desktop)

**As ADMIN:**
| # | Link | URL | Expected | Pass |
|---|------|-----|----------|------|
| 2.1.1 | Dashboard | /dashboard | Loads | [ ] |
| 2.1.2 | Members | /members | Loads | [ ] |
| 2.1.3 | Appointments | /appointments | Loads | [ ] |
| 2.1.4 | Bootcamps | /bootcamps | Loads | [ ] |
| 2.1.5 | Cohorts | /cohorts | Loads | [ ] |
| 2.1.6 | Billing | /billing | Loads | [ ] |
| 2.1.7 | Reports | /reports | Loads | [ ] |
| 2.1.8 | Questionnaires | /admin/questionnaires | Loads | [ ] |
| 2.1.9 | HealthKit | /admin/healthkit | Loads | [ ] |
| 2.1.10 | Settings | /admin/settings | Loads | [ ] |
| 2.1.11 | Users | /admin/users | Loads | [ ] |
| 2.1.12 | Timer | /timer | Loads | [ ] |

**As COACH:**
| # | Link | URL | Expected | Pass |
|---|------|-----|----------|------|
| 2.1.13 | Dashboard | /dashboard | Loads | [ ] |
| 2.1.14 | Members | /members | Loads | [ ] |
| 2.1.15 | Review Queue | /coach/review-queue | Loads | [ ] |
| 2.1.16 | Reports | /reports | Loads (filtered data) | [ ] |
| 2.1.17 | No Billing link | - | Not visible | [ ] |
| 2.1.18 | No Admin links | - | Not visible | [ ] |

**As CLIENT:**
| # | Link | URL | Expected | Pass |
|---|------|-----|----------|------|
| 2.1.19 | Dashboard | /client/dashboard | Loads | [ ] |
| 2.1.20 | My Appointments | /appointments/me | Loads | [ ] |
| 2.1.21 | My Bootcamps | /client/bootcamps | Loads | [ ] |
| 2.1.22 | My Cohorts | /cohorts/me | Loads | [ ] |
| 2.1.23 | Health Data | /client/health | Loads | [ ] |
| 2.1.24 | My Invoices | /invoices/me | Loads | [ ] |
| 2.1.25 | Settings | /settings | Loads | [ ] |

### 2.2 Mobile Navigation
| # | Test Case | Steps | Expected Result | Pass |
|---|-----------|-------|-----------------|------|
| 2.2.1 | Hamburger menu | Resize to mobile width | Menu icon appears | [ ] |
| 2.2.2 | Open drawer | Click hamburger icon | Navigation drawer opens | [ ] |
| 2.2.3 | All links present | Check drawer contents | All role-appropriate links | [ ] |
| 2.2.4 | Close on navigate | Click a link | Drawer closes, navigates | [ ] |
| 2.2.5 | Close on outside click | Click outside drawer | Drawer closes | [ ] |

---

## 3. Dashboard

### 3.1 Admin/Coach Dashboard
| # | Test Case | Steps | Expected Result | Pass |
|---|-----------|-------|-----------------|------|
| 3.1.1 | Page loads | Navigate to /dashboard | No errors | [ ] |
| 3.1.2 | Summary cards | View dashboard | Member/appointment/revenue cards | [ ] |
| 3.1.3 | Recent activity | Scroll down | Recent entries shown | [ ] |

### 3.2 Coach Analytics Dashboard
| # | Test Case | Steps | Expected Result | Pass |
|---|-----------|-------|-----------------|------|
| 3.2.1 | Attention scores | Login as coach, view dashboard | Member priority list | [ ] |
| 3.2.2 | Color coding | View attention scores | Red/amber/green indicators | [ ] |
| 3.2.3 | Member drill-down | Click on member | Check-in details shown | [ ] |
| 3.2.4 | Cohort filtering | Filter by cohort | Only cohort members shown | [ ] |

### 3.3 Client Dashboard
| # | Test Case | Steps | Expected Result | Pass |
|---|-----------|-------|-----------------|------|
| 3.3.1 | Page loads | Login as client, go to /client/dashboard | No errors | [ ] |
| 3.3.2 | Check-in stats | View dashboard | Streak, compliance %, total shown | [ ] |
| 3.3.3 | Quick links | View dashboard | Links to health, appointments | [ ] |

---

## 4. Member Management

**Login as:** COACH or ADMIN

### 4.1 Member List
| # | Test Case | Steps | Expected Result | Pass |
|---|-----------|-------|-----------------|------|
| 4.1.1 | List loads | Navigate to /members | All members displayed | [ ] |
| 4.1.2 | Search | Type in search box | Results filter | [ ] |
| 4.1.3 | Click member | Click on Alice Client | Detail page loads | [ ] |

### 4.2 Member Detail
| # | Test Case | Steps | Expected Result | Pass |
|---|-----------|-------|-----------------|------|
| 4.2.1 | Detail loads | View member detail | All info displayed | [ ] |
| 4.2.2 | Appointments tab | Click appointments | Member's appointments shown | [ ] |
| 4.2.3 | Cohorts tab | Click cohorts | Member's cohorts shown | [ ] |
| 4.2.4 | Back navigation | Click back | Returns to list | [ ] |

### 4.3 Member CRUD (Admin only)
| # | Test Case | Steps | Expected Result | Pass |
|---|-----------|-------|-----------------|------|
| 4.3.1 | Create member | Click New, fill form, save | Member created | [ ] |
| 4.3.2 | Edit member | Edit name, save | Changes persist | [ ] |
| 4.3.3 | Delete member | Click delete, confirm | Member removed | [ ] |

---

## 5. Admin User Management

**Login as:** ADMIN

### 5.1 User List
| # | Test Case | Steps | Expected Result | Pass |
|---|-----------|-------|-----------------|------|
| 5.1.1 | Page loads | Navigate to /admin/users | User list displayed | [ ] |
| 5.1.2 | Search users | Type in search | Results filter | [ ] |
| 5.1.3 | Role filter | Filter by role | Only matching roles shown | [ ] |
| 5.1.4 | Pagination | Navigate pages | Different users shown | [ ] |

### 5.2 User Detail
| # | Test Case | Steps | Expected Result | Pass |
|---|-----------|-------|-----------------|------|
| 5.2.1 | Detail loads | Click on user | /admin/users/[id] loads | [ ] |
| 5.2.2 | Edit name | Change name, save | Name updated | [ ] |
| 5.2.3 | Change role | Change role dropdown | Role updated | [ ] |
| 5.2.4 | Credit section | Scroll to credits | Credit management visible | [ ] |

### 5.3 Bulk Actions
| # | Test Case | Steps | Expected Result | Pass |
|---|-----------|-------|-----------------|------|
| 5.3.1 | Select all | Click select all checkbox | All users selected | [ ] |
| 5.3.2 | Select individual | Click row checkbox | User selected | [ ] |
| 5.3.3 | Bulk delete | Select users, click delete | Confirmation dialog | [ ] |
| 5.3.4 | Bulk role change | Select users, change role | All roles updated | [ ] |

### 5.4 Audit Logging
| # | Test Case | Steps | Expected Result | Pass |
|---|-----------|-------|-----------------|------|
| 5.4.1 | Create logged | Create user | Audit entry created | [ ] |
| 5.4.2 | Update logged | Edit user | Audit entry created | [ ] |
| 5.4.3 | Delete logged | Delete user | Audit entry created | [ ] |

---

## 6. Appointments

**Login as:** COACH or ADMIN

### 6.1 Appointment List
| # | Test Case | Steps | Expected Result | Pass |
|---|-----------|-------|-----------------|------|
| 6.1.1 | List loads | Navigate to /appointments | Appointments shown | [ ] |
| 6.1.2 | Calendar view | Click calendar tab | Calendar displays | [ ] |
| 6.1.3 | Week view | Switch to week | Week calendar shows | [ ] |
| 6.1.4 | Month view | Switch to month | Month calendar shows | [ ] |
| 6.1.5 | Status filter | Filter by status | Only matching shown | [ ] |

### 6.2 Create Appointment
| # | Test Case | Steps | Expected Result | Pass |
|---|-----------|-------|-----------------|------|
| 6.2.1 | Open form | Click New Appointment | Form opens | [ ] |
| 6.2.2 | Select member | Choose from dropdown | Member selected | [ ] |
| 6.2.3 | Set date/time | Pick date and time | Date populated | [ ] |
| 6.2.4 | Set fee | Enter 75 | Fee set | [ ] |
| 6.2.5 | Submit | Click create | Appointment created | [ ] |
| 6.2.6 | Email sent | Check logs | Confirmation email sent | [ ] |

### 6.3 Appointment Detail
| # | Test Case | Steps | Expected Result | Pass |
|---|-----------|-------|-----------------|------|
| 6.3.1 | Detail loads | Click appointment | /appointments/[id] loads | [ ] |
| 6.3.2 | Edit notes | Add coach notes | Notes saved | [ ] |
| 6.3.3 | Update status | Change to ATTENDED | Status updated | [ ] |
| 6.3.4 | Delete | Click delete, confirm | Appointment removed | [ ] |

### 6.4 Conflict Detection
| # | Test Case | Steps | Expected Result | Pass |
|---|-----------|-------|-----------------|------|
| 6.4.1 | Create conflict | Book same member, overlapping time | Error: conflict detected | [ ] |
| 6.4.2 | Update conflict | Move appointment to conflict | Error: conflict detected | [ ] |
| 6.4.3 | Adjacent OK | Book back-to-back | No error | [ ] |

### 6.5 Google Calendar Sync
| # | Test Case | Steps | Expected Result | Pass |
|---|-----------|-------|-----------------|------|
| 6.5.1 | Sync button | Click sync icon | Calendar event created | [ ] |
| 6.5.2 | Event ID stored | Check appointment | googleEventId populated | [ ] |
| 6.5.3 | Delete syncs | Delete appointment | Calendar event removed | [ ] |

---

## 7. Client Appointments

**Login as:** CLIENT

### 7.1 My Appointments Calendar
| # | Test Case | Steps | Expected Result | Pass |
|---|-----------|-------|-----------------|------|
| 7.1.1 | Page loads | Navigate to /appointments/me | Calendar displays | [ ] |
| 7.1.2 | Own appointments only | View calendar | Only client's appointments | [ ] |
| 7.1.3 | Click appointment | Click on event | Detail page opens | [ ] |

### 7.2 Appointment Detail
| # | Test Case | Steps | Expected Result | Pass |
|---|-----------|-------|-----------------|------|
| 7.2.1 | Detail loads | Navigate to /appointments/me/[id] | Details shown | [ ] |
| 7.2.2 | Date/time | View details | Correct date/time | [ ] |
| 7.2.3 | Status badge | View status | Correct badge color | [ ] |
| 7.2.4 | Coach notes | View notes | Notes visible if present | [ ] |

### 7.3 Cancel Appointment
| # | Test Case | Steps | Expected Result | Pass |
|---|-----------|-------|-----------------|------|
| 7.3.1 | Cancel button | View upcoming appointment | Cancel button visible | [ ] |
| 7.3.2 | 24hr restriction | Appointment < 24hrs away | Cancel button disabled | [ ] |
| 7.3.3 | Cancel flow | Click cancel, confirm | Appointment cancelled | [ ] |
| 7.3.4 | Email sent | After cancel | Cancellation email sent | [ ] |

---

## 8. Bootcamps

**Login as:** COACH or ADMIN

### 8.1 Bootcamp List
| # | Test Case | Steps | Expected Result | Pass |
|---|-----------|-------|-----------------|------|
| 8.1.1 | List loads | Navigate to /bootcamps | Bootcamps shown | [ ] |
| 8.1.2 | Calendar view | Click calendar | Calendar displays | [ ] |
| 8.1.3 | Capacity shown | View list | X/Y capacity indicator | [ ] |

### 8.2 Bootcamp Detail
| # | Test Case | Steps | Expected Result | Pass |
|---|-----------|-------|-----------------|------|
| 8.2.1 | Detail loads | Click bootcamp | Details shown | [ ] |
| 8.2.2 | Attendee list | View attendees | List of registered | [ ] |
| 8.2.3 | Add attendee | Add member | Count increases | [ ] |
| 8.2.4 | Remove attendee | Remove member | Count decreases | [ ] |

### 8.3 Capacity Enforcement
| # | Test Case | Steps | Expected Result | Pass |
|---|-----------|-------|-----------------|------|
| 8.3.1 | At capacity warning | Fill to capacity | Warning shown | [ ] |
| 8.3.2 | Over capacity blocked | Try to add when full | Error: at capacity | [ ] |

### 8.4 Client Registration
| # | Test Case | Steps | Expected Result | Pass |
|---|-----------|-------|-----------------|------|
| 8.4.1 | Browse bootcamps | As client, /client/bootcamps | Available bootcamps shown | [ ] |
| 8.4.2 | Register | Click register | Added to attendees | [ ] |
| 8.4.3 | Credit consumed | After register | Credit decremented | [ ] |
| 8.4.4 | Unregister | Click unregister | Removed from attendees | [ ] |
| 8.4.5 | Credit refund | After unregister (before start) | Credit refunded | [ ] |

---

## 9. Cohorts

**Login as:** COACH or ADMIN

### 9.1 Cohort List
| # | Test Case | Steps | Expected Result | Pass |
|---|-----------|-------|-----------------|------|
| 9.1.1 | List loads | Navigate to /cohorts | Cohorts shown | [ ] |
| 9.1.2 | Status filter | Filter by ACTIVE | Only active shown | [ ] |
| 9.1.3 | Member/coach counts | View cards | Counts displayed | [ ] |

### 9.2 Cohort Detail
| # | Test Case | Steps | Expected Result | Pass |
|---|-----------|-------|-----------------|------|
| 9.2.1 | Detail loads | Click cohort | /cohorts/[id] loads | [ ] |
| 9.2.2 | Status badge | View header | Correct status badge | [ ] |
| 9.2.3 | Inline edit name | Click, edit, blur | Name updated | [ ] |
| 9.2.4 | Inline edit description | Click, edit, blur | Description updated | [ ] |

### 9.3 Coach Assignment
| # | Test Case | Steps | Expected Result | Pass |
|---|-----------|-------|-----------------|------|
| 9.3.1 | View coaches | See coach section | Assigned coaches listed | [ ] |
| 9.3.2 | Add coach | Select and add | Coach added | [ ] |
| 9.3.3 | Remove coach | Click remove | Coach removed | [ ] |

### 9.4 Member Management
| # | Test Case | Steps | Expected Result | Pass |
|---|-----------|-------|-----------------|------|
| 9.4.1 | View members | See member section | Members with status | [ ] |
| 9.4.2 | Add member | Select and add | Member added, email sent | [ ] |
| 9.4.3 | Change status | Set to PAUSED | Status badge updates | [ ] |
| 9.4.4 | Remove member | Click remove | Member removed | [ ] |

### 9.5 Check-In Config
| # | Test Case | Steps | Expected Result | Pass |
|---|-----------|-------|-----------------|------|
| 9.5.1 | View config | Scroll to check-in settings | Config editor visible | [ ] |
| 9.5.2 | Toggle prompt | Toggle optional prompt | Setting saved | [ ] |
| 9.5.3 | Add custom | Add custom prompt | Prompt added | [ ] |

### 9.6 Status Transitions
| # | Test Case | Steps | Expected Result | Pass |
|---|-----------|-------|-----------------|------|
| 9.6.1 | Complete cohort | Click Complete | Status = COMPLETED | [ ] |
| 9.6.2 | Archive cohort | Click Archive | Status = ARCHIVED | [ ] |

### 9.7 Client View
| # | Test Case | Steps | Expected Result | Pass |
|---|-----------|-------|-----------------|------|
| 9.7.1 | My cohorts | As client, /cohorts/me | Own cohorts shown | [ ] |
| 9.7.2 | Read-only | View cohort detail | No edit controls | [ ] |

---

## 10. Daily Check-Ins

**Login as:** CLIENT

### 10.1 Check-In Form
| # | Test Case | Steps | Expected Result | Pass |
|---|-----------|-------|-----------------|------|
| 10.1.1 | Page loads | Navigate to /client/health | Form displayed | [ ] |
| 10.1.2 | Enter weight | Type 179.5 | Value accepted | [ ] |
| 10.1.3 | Enter steps | Type 10500 | Value accepted | [ ] |
| 10.1.4 | Enter calories | Type 2100 | Value accepted | [ ] |
| 10.1.5 | Enter sleep quality | Type 8 | Value accepted (1-10) | [ ] |
| 10.1.6 | Enter stress | Type 4 | Value accepted (1-10) | [ ] |
| 10.1.7 | Enter notes | Type text | Text accepted | [ ] |
| 10.1.8 | Submit | Click Submit Check-In | Entry created | [ ] |

### 10.2 HealthKit Preview
| # | Test Case | Steps | Expected Result | Pass |
|---|-----------|-------|-----------------|------|
| 10.2.1 | HealthKit indicator | View form with HealthKit data | Purple indicator shown | [ ] |
| 10.2.2 | Auto-fill preview | Empty field with HK data | Shows "HealthKit: X" | [ ] |
| 10.2.3 | Auto-populate | Submit without entering | HealthKit values used | [ ] |
| 10.2.4 | Data source tracking | View entry | dataSources shows "healthkit" | [ ] |

### 10.3 Check-In History
| # | Test Case | Steps | Expected Result | Pass |
|---|-----------|-------|-----------------|------|
| 10.3.1 | History displays | Scroll down | Past entries shown | [ ] |
| 10.3.2 | Sort order | View entries | Most recent first | [ ] |
| 10.3.3 | Data source badges | View Source column | Badges for manual/healthkit | [ ] |
| 10.3.4 | Missing fields | Entry with partial data | Shows "—" for missing | [ ] |

### 10.4 Check-In Stats
| # | Test Case | Steps | Expected Result | Pass |
|---|-----------|-------|-----------------|------|
| 10.4.1 | Stats widget | View page header | Stats displayed | [ ] |
| 10.4.2 | Streak count | View streak | Correct consecutive days | [ ] |
| 10.4.3 | Compliance % | View percentage | Correct calculation | [ ] |
| 10.4.4 | Total count | View total | Correct count | [ ] |

### 10.5 Delete Entry
| # | Test Case | Steps | Expected Result | Pass |
|---|-----------|-------|-----------------|------|
| 10.5.1 | Delete button | View entry in history | Delete option visible | [ ] |
| 10.5.2 | Confirm delete | Click delete, confirm | Entry removed | [ ] |
| 10.5.3 | Own entries only | Try delete another's | Error or not visible | [ ] |

---

## 11. Weekly Questionnaires

**Login as:** CLIENT

### 11.1 Access Questionnaire
| # | Test Case | Steps | Expected Result | Pass |
|---|-----------|-------|-----------------|------|
| 11.1.1 | Navigate to week | Go to /client/questionnaires/[cohortId]/1 | Page loads | [ ] |
| 11.1.2 | SurveyJS renders | View questionnaire | Survey form displayed | [ ] |
| 11.1.3 | Questions match template | View questions | Matches week 1 template | [ ] |

### 11.2 Complete Questionnaire
| # | Test Case | Steps | Expected Result | Pass |
|---|-----------|-------|-----------------|------|
| 11.2.1 | Fill wins | Enter text | Value saved | [ ] |
| 11.2.2 | Fill challenges | Enter text | Value saved | [ ] |
| 11.2.3 | Fill days_trained | Enter 5 | Value saved (0-7) | [ ] |
| 11.2.4 | Fill days_hit_steps | Enter 6 | Value saved (0-7) | [ ] |
| 11.2.5 | Fill days_on_calories | Enter 4 | Value saved (0-7) | [ ] |
| 11.2.6 | Fill nutrition_help | Enter text | Value saved | [ ] |
| 11.2.7 | Fill behavior_goal | Enter text | Value saved | [ ] |
| 11.2.8 | Save progress | Click Save Progress | Status = IN_PROGRESS | [ ] |
| 11.2.9 | Submit | Click Submit | Status = COMPLETED | [ ] |

### 11.3 Week Locking
| # | Test Case | Steps | Expected Result | Pass |
|---|-----------|-------|-----------------|------|
| 11.3.1 | Past week locked | View completed week | Read-only, locked banner | [ ] |
| 11.3.2 | Future week blocked | Try week ahead | "Not available yet" | [ ] |
| 11.3.3 | Current week editable | View current week | Form is editable | [ ] |

### 11.4 Week-Specific Questions
| # | Test Case | Steps | Expected Result | Pass |
|---|-----------|-------|-----------------|------|
| 11.4.1 | Week 1: behavior_goal | View week 1 | Goal setting question | [ ] |
| 11.4.2 | Week 2: goal_review | View week 2 | "Last week you set..." | [ ] |
| 11.4.3 | Week 4: monthly_reflection | View week 4 | "Most proud of..." | [ ] |
| 11.4.4 | Week 6: program_reflection | View week 6 | Final program questions | [ ] |
| 11.4.5 | Week 6: next_steps | View week 6 | "Goals moving forward" | [ ] |

---

## 12. Questionnaire Builder (Admin)

**Login as:** ADMIN

### 12.1 Bundle List
| # | Test Case | Steps | Expected Result | Pass |
|---|-----------|-------|-----------------|------|
| 12.1.1 | Page loads | Navigate to /admin/questionnaires | Bundles listed | [ ] |
| 12.1.2 | Grouped by cohort | View list | Bundles grouped | [ ] |
| 12.1.3 | Week numbers | View bundles | Week numbers shown | [ ] |

### 12.2 Create Bundle
| # | Test Case | Steps | Expected Result | Pass |
|---|-----------|-------|-----------------|------|
| 12.2.1 | Navigate to new | Click New Bundle | Form loads | [ ] |
| 12.2.2 | Select cohort | Choose from dropdown | Cohort selected | [ ] |
| 12.2.3 | Select week | Choose week number | Week selected | [ ] |
| 12.2.4 | Template loaded | View builder | Default template loaded | [ ] |

### 12.3 Question Builder
| # | Test Case | Steps | Expected Result | Pass |
|---|-----------|-------|-----------------|------|
| 12.3.1 | Add question | Click Add Question | New question added | [ ] |
| 12.3.2 | Remove question | Click remove icon | Question removed | [ ] |
| 12.3.3 | Reorder up | Click up arrow | Question moves up | [ ] |
| 12.3.4 | Reorder down | Click down arrow | Question moves down | [ ] |
| 12.3.5 | Change type | Select different type | Type changes | [ ] |
| 12.3.6 | Edit title | Edit question text | Title updates | [ ] |
| 12.3.7 | Toggle required | Toggle checkbox | isRequired changes | [ ] |

### 12.4 Rich Text Editor
| # | Test Case | Steps | Expected Result | Pass |
|---|-----------|-------|-----------------|------|
| 12.4.1 | TipTap loads | Click HTML intro field | Editor opens | [ ] |
| 12.4.2 | Bold text | Select, click bold | Text bolded | [ ] |
| 12.4.3 | Add link | Insert link | Link added | [ ] |
| 12.4.4 | Save HTML | Save bundle | HTML preserved | [ ] |

### 12.5 Delete Bundle
| # | Test Case | Steps | Expected Result | Pass |
|---|-----------|-------|-----------------|------|
| 12.5.1 | Delete empty | Delete bundle with no responses | Bundle deleted | [ ] |
| 12.5.2 | Block with responses | Try delete with responses | Error: has responses | [ ] |

---

## 13. Invoicing & Billing

**Login as:** ADMIN

### 13.1 Billing Dashboard
| # | Test Case | Steps | Expected Result | Pass |
|---|-----------|-------|-----------------|------|
| 13.1.1 | Page loads | Navigate to /billing | Dashboard loads | [ ] |
| 13.1.2 | Revenue chart | View chart | Monthly revenue displayed | [ ] |
| 13.1.3 | Year selector | Change year | Chart updates | [ ] |

### 13.2 Invoice List
| # | Test Case | Steps | Expected Result | Pass |
|---|-----------|-------|-----------------|------|
| 13.2.1 | List loads | View invoice list | Invoices shown | [ ] |
| 13.2.2 | Status filter | Filter by UNPAID | Only unpaid shown | [ ] |
| 13.2.3 | Status badges | View list | Correct badge colors | [ ] |

### 13.3 Generate Invoice
| # | Test Case | Steps | Expected Result | Pass |
|---|-----------|-------|-----------------|------|
| 13.3.1 | Open dialog | Click Generate Invoice | Dialog opens | [ ] |
| 13.3.2 | Select member | Choose member | Member selected | [ ] |
| 13.3.3 | Select month | Choose month | Month selected | [ ] |
| 13.3.4 | Generate | Click generate | Invoice created | [ ] |
| 13.3.5 | Appointments linked | View invoice | ATTENDED appointments linked | [ ] |
| 13.3.6 | Email sent | Check logs | Invoice notification sent | [ ] |

### 13.4 Invoice Detail
| # | Test Case | Steps | Expected Result | Pass |
|---|-----------|-------|-----------------|------|
| 13.4.1 | Detail loads | Click invoice | /billing/[id] loads | [ ] |
| 13.4.2 | Line items | View breakdown | Appointments listed | [ ] |
| 13.4.3 | Total | View total | Correct sum | [ ] |
| 13.4.4 | Payment link | View link | Stripe URL present | [ ] |

### 13.5 Payment Status
| # | Test Case | Steps | Expected Result | Pass |
|---|-----------|-------|-----------------|------|
| 13.5.1 | Mark paid | Change status to PAID | paidAt populated | [ ] |
| 13.5.2 | Email on paid | After marking paid | Confirmation email sent | [ ] |

### 13.6 Revenue Stats
| # | Test Case | Steps | Expected Result | Pass |
|---|-----------|-------|-----------------|------|
| 13.6.1 | Monthly totals | View stats | Correct monthly totals | [ ] |
| 13.6.2 | UK tax year | Filter by tax year | April-March grouping | [ ] |

### 13.7 Client Invoice View
| # | Test Case | Steps | Expected Result | Pass |
|---|-----------|-------|-----------------|------|
| 13.7.1 | My invoices | As client, /invoices/me | Own invoices only | [ ] |
| 13.7.2 | Invoice detail | Click invoice | /invoices/me/[id] loads | [ ] |
| 13.7.3 | Payment link | View detail | Pay button visible | [ ] |
| 13.7.4 | Print view | Click print | Print-friendly layout | [ ] |

---

## 14. Reports Dashboard

**Login as:** ADMIN or COACH

### 14.1 Reports Page
| # | Test Case | Steps | Expected Result | Pass |
|---|-----------|-------|-----------------|------|
| 14.1.1 | Page loads | Navigate to /reports | Dashboard loads | [ ] |
| 14.1.2 | Tab navigation | Click different tabs | Tabs switch | [ ] |

### 14.2 Overview Tab
| # | Test Case | Steps | Expected Result | Pass |
|---|-----------|-------|-----------------|------|
| 14.2.1 | Summary cards | View overview | Key metrics displayed | [ ] |
| 14.2.2 | Growth indicators | View cards | Trend arrows shown | [ ] |
| 14.2.3 | Quick stats | View section | Active members, cohorts | [ ] |

### 14.3 Member Engagement
| # | Test Case | Steps | Expected Result | Pass |
|---|-----------|-------|-----------------|------|
| 14.3.1 | Engagement chart | View tab | Check-in trends displayed | [ ] |
| 14.3.2 | Status distribution | View pie chart | Active/paused/inactive | [ ] |
| 14.3.3 | Activity trends | View area chart | Time series data | [ ] |

### 14.4 Cohort Analytics
| # | Test Case | Steps | Expected Result | Pass |
|---|-----------|-------|-----------------|------|
| 14.4.1 | Cohort table | View tab | All cohorts listed | [ ] |
| 14.4.2 | Performance metrics | View columns | Engagement rates | [ ] |
| 14.4.3 | Engagement chart | View bar chart | Per-cohort comparison | [ ] |

### 14.5 Revenue Analytics (Admin only)
| # | Test Case | Steps | Expected Result | Pass |
|---|-----------|-------|-----------------|------|
| 14.5.1 | Revenue chart | View tab | Monthly revenue | [ ] |
| 14.5.2 | Invoice status | View breakdown | Paid/unpaid/overdue | [ ] |
| 14.5.3 | Top clients | View list | Highest revenue clients | [ ] |
| 14.5.4 | Coach no access | As coach, view tab | Tab hidden or empty | [ ] |

### 14.6 Compliance Report
| # | Test Case | Steps | Expected Result | Pass |
|---|-----------|-------|-----------------|------|
| 14.6.1 | Completion rates | View tab | Questionnaire completion | [ ] |
| 14.6.2 | By week | View breakdown | Week-by-week stats | [ ] |
| 14.6.3 | By cohort | View breakdown | Per-cohort completion | [ ] |

### 14.7 Export
| # | Test Case | Steps | Expected Result | Pass |
|---|-----------|-------|-----------------|------|
| 14.7.1 | Export CSV | Click CSV button | File downloads | [ ] |
| 14.7.2 | Export JSON | Click JSON button | File downloads | [ ] |
| 14.7.3 | Data accuracy | Open exported file | Data matches display | [ ] |

### 14.8 Role-Based Filtering
| # | Test Case | Steps | Expected Result | Pass |
|---|-----------|-------|-----------------|------|
| 14.8.1 | Admin sees all | As admin, view reports | All data visible | [ ] |
| 14.8.2 | Coach filtered | As coach, view reports | Only own cohorts | [ ] |

---

## 15. Coach Review Queue

**Login as:** COACH

### 15.1 Review Queue Page
| # | Test Case | Steps | Expected Result | Pass |
|---|-----------|-------|-----------------|------|
| 15.1.1 | Page loads | Navigate to /coach/review-queue | Dashboard loads | [ ] |
| 15.1.2 | Client list | View list | Cohort members shown | [ ] |
| 15.1.3 | Attention scores | View scores | Color-coded priorities | [ ] |

### 15.2 Week Navigation
| # | Test Case | Steps | Expected Result | Pass |
|---|-----------|-------|-----------------|------|
| 15.2.1 | Current week | Default view | Current week shown | [ ] |
| 15.2.2 | Previous week | Click previous | Prior week data | [ ] |
| 15.2.3 | Next week | Click next | Following week data | [ ] |
| 15.2.4 | Today button | Click today | Returns to current | [ ] |

### 15.3 Filters
| # | Test Case | Steps | Expected Result | Pass |
|---|-----------|-------|-----------------|------|
| 15.3.1 | Priority filter | Filter by red | Only high priority | [ ] |
| 15.3.2 | Cohort filter | Select cohort | Only cohort members | [ ] |
| 15.3.3 | Clear filters | Clear all | All members shown | [ ] |

### 15.4 Review Panel
| # | Test Case | Steps | Expected Result | Pass |
|---|-----------|-------|-----------------|------|
| 15.4.1 | Expand panel | Click on member | Panel expands | [ ] |
| 15.4.2 | Weekly stats | View panel | Check-in summary | [ ] |
| 15.4.3 | Questionnaire status | View panel | Completion status | [ ] |

### 15.5 Coach Feedback
| # | Test Case | Steps | Expected Result | Pass |
|---|-----------|-------|-----------------|------|
| 15.5.1 | Enter Loom URL | Paste URL | URL saved | [ ] |
| 15.5.2 | Enter note | Type feedback | Note saved | [ ] |
| 15.5.3 | Save response | Click save | Response persisted | [ ] |
| 15.5.4 | Email sent | After save with content | Notification sent | [ ] |

### 15.6 Email Draft
| # | Test Case | Steps | Expected Result | Pass |
|---|-----------|-------|-----------------|------|
| 15.6.1 | Generate draft | Click email draft | Draft generated | [ ] |
| 15.6.2 | Copy to clipboard | Click copy | Text copied | [ ] |
| 15.6.3 | Draft content | View draft | Includes stats + feedback | [ ] |

---

## 16. Settings

### 16.1 User Settings

**Login as:** Any user

| # | Test Case | Steps | Expected Result | Pass |
|---|-----------|-------|-----------------|------|
| 16.1.1 | Page loads | Navigate to /settings | Form loads | [ ] |
| 16.1.2 | Edit name | Change name, save | Name updated | [ ] |
| 16.1.3 | Edit email | Change email, save | Email updated | [ ] |
| 16.1.4 | Change password | Enter new password | Password changed | [ ] |
| 16.1.5 | View credits | See credit balance | Balance displayed | [ ] |

### 16.2 Admin System Settings

**Login as:** ADMIN

| # | Test Case | Steps | Expected Result | Pass |
|---|-----------|-------|-----------------|------|
| 16.2.1 | Page loads | Navigate to /admin/settings | Form loads | [ ] |
| 16.2.2 | Max clients | Change value, save | Setting updated | [ ] |
| 16.2.3 | HealthKit toggle | Toggle on/off | Setting updated | [ ] |
| 16.2.4 | iOS integration | Toggle on/off | Setting updated | [ ] |
| 16.2.5 | Macro percentages | Change values | Settings updated | [ ] |

---

## 17. HealthKit Integration

**Login as:** ADMIN

### 17.1 Admin Dashboard
| # | Test Case | Steps | Expected Result | Pass |
|---|-----------|-------|-----------------|------|
| 17.1.1 | Page loads | Navigate to /admin/healthkit | Dashboard loads | [ ] |
| 17.1.2 | Stats cards | View stats | Paired clients, active codes | [ ] |
| 17.1.3 | Workout count | View stats | Total workouts | [ ] |
| 17.1.4 | Sleep count | View stats | Total sleep records | [ ] |

### 17.2 Pairing Codes
| # | Test Case | Steps | Expected Result | Pass |
|---|-----------|-------|-----------------|------|
| 17.2.1 | Generate code | Select client, generate | 6-char code created | [ ] |
| 17.2.2 | Code format | View code | Alphanumeric, no ambiguous chars | [ ] |
| 17.2.3 | Copy code | Click copy | Copied to clipboard | [ ] |
| 17.2.4 | Expiry shown | View code | 24h expiry time | [ ] |
| 17.2.5 | Active codes list | View section | Unexpired codes listed | [ ] |

### 17.3 Data Explorer
| # | Test Case | Steps | Expected Result | Pass |
|---|-----------|-------|-----------------|------|
| 17.3.1 | Workouts tab | View workouts | Type, duration, calories | [ ] |
| 17.3.2 | Sleep tab | View sleep | Date, total, deep, REM | [ ] |
| 17.3.3 | Steps tab | View steps | Daily totals | [ ] |

### 17.4 API Endpoints (Manual/Postman)
| # | Test Case | Steps | Expected Result | Pass |
|---|-----------|-------|-----------------|------|
| 17.4.1 | POST /api/healthkit/pair | Send pairing code | Returns client info | [ ] |
| 17.4.2 | POST /api/healthkit/workouts | Send workout data | Data stored | [ ] |
| 17.4.3 | POST /api/healthkit/sleep | Send sleep data | Data stored | [ ] |
| 17.4.4 | POST /api/healthkit/steps | Send step data | Updates Entry | [ ] |

---

## 18. Credit Management

**Login as:** ADMIN

### 18.1 Credit Allocation
| # | Test Case | Steps | Expected Result | Pass |
|---|-----------|-------|-----------------|------|
| 18.1.1 | View in user detail | Go to /admin/users/[id] | Credit section visible | [ ] |
| 18.1.2 | Current balance | View widget | Correct balance | [ ] |
| 18.1.3 | Add credits | Enter positive amount | Balance increases | [ ] |
| 18.1.4 | Deduct credits | Enter negative amount | Balance decreases | [ ] |
| 18.1.5 | Enter reason | Add reason text | Reason saved | [ ] |
| 18.1.6 | Set expiry | Add expiry date | Expiry saved | [ ] |

### 18.2 Credit History
| # | Test Case | Steps | Expected Result | Pass |
|---|-----------|-------|-----------------|------|
| 18.2.1 | History table | View section | Transactions listed | [ ] |
| 18.2.2 | Transaction details | View row | Amount, reason, date | [ ] |
| 18.2.3 | Created by | View row | Admin name shown | [ ] |

### 18.3 Negative Balance Prevention
| # | Test Case | Steps | Expected Result | Pass |
|---|-----------|-------|-----------------|------|
| 18.3.1 | Prevent negative | Try deduct more than balance | Error message | [ ] |

---

## 19. Email Notifications

### 19.1 Appointment Emails
| # | Test Case | Steps | Expected Result | Pass |
|---|-----------|-------|-----------------|------|
| 19.1.1 | Confirmation | Create appointment | Email sent to client | [ ] |
| 19.1.2 | Cancellation | Cancel appointment | Email sent to client | [ ] |

### 19.2 Invoice Emails
| # | Test Case | Steps | Expected Result | Pass |
|---|-----------|-------|-----------------|------|
| 19.2.1 | Invoice sent | Generate invoice | Email sent to client | [ ] |
| 19.2.2 | Payment confirmation | Mark as paid | Email sent to client | [ ] |

### 19.3 Cohort Emails
| # | Test Case | Steps | Expected Result | Pass |
|---|-----------|-------|-----------------|------|
| 19.3.1 | Cohort invitation | Add member to cohort | Email sent to member | [ ] |

### 19.4 Coach Note Emails
| # | Test Case | Steps | Expected Result | Pass |
|---|-----------|-------|-----------------|------|
| 19.4.1 | Note received | Coach saves feedback | Email sent to client | [ ] |

### 19.5 Test User Suppression
| # | Test Case | Steps | Expected Result | Pass |
|---|-----------|-------|-----------------|------|
| 19.5.1 | isTestUser flag | Set flag on user | Emails logged, not sent | [ ] |

---

## 20. Error Handling & Loading States

### 20.1 Error Boundary
| # | Test Case | Steps | Expected Result | Pass |
|---|-----------|-------|-----------------|------|
| 20.1.1 | Error display | Trigger component error | Error boundary shown | [ ] |
| 20.1.2 | Try again | Click retry | Attempts re-render | [ ] |
| 20.1.3 | Dashboard link | Click go to dashboard | Navigates home | [ ] |

### 20.2 Loading States
| # | Test Case | Steps | Expected Result | Pass |
|---|-----------|-------|-----------------|------|
| 20.2.1 | Global loading | Navigate to page | Skeleton shown | [ ] |
| 20.2.2 | Appointments loading | Visit /appointments | Custom skeleton | [ ] |
| 20.2.3 | Cohorts loading | Visit /cohorts | Card grid skeleton | [ ] |
| 20.2.4 | Reports loading | Visit /reports | Chart skeleton | [ ] |
| 20.2.5 | Users loading | Visit /admin/users | Table skeleton | [ ] |

### 20.3 Form Validation
| # | Test Case | Steps | Expected Result | Pass |
|---|-----------|-------|-----------------|------|
| 20.3.1 | Required fields | Submit empty form | Validation errors | [ ] |
| 20.3.2 | Number ranges | Enter invalid number | Range error | [ ] |
| 20.3.3 | Date validation | Invalid date | Date error | [ ] |

### 20.4 404 Handling
| # | Test Case | Steps | Expected Result | Pass |
|---|-----------|-------|-----------------|------|
| 20.4.1 | Invalid route | Visit /nonexistent | 404 page | [ ] |
| 20.4.2 | Invalid ID | Visit /members/999999 | 404 or error | [ ] |

---

## 21. Timer PWA

**Login as:** Any user

### 21.1 Timer Functionality
| # | Test Case | Steps | Expected Result | Pass |
|---|-----------|-------|-----------------|------|
| 21.1.1 | Page loads | Navigate to /timer | Timer interface | [ ] |
| 21.1.2 | Start timer | Click start | Timer counts down | [ ] |
| 21.1.3 | Pause timer | Click pause | Timer pauses | [ ] |
| 21.1.4 | Stop timer | Click stop | Timer resets | [ ] |

### 21.2 Presets
| # | Test Case | Steps | Expected Result | Pass |
|---|-----------|-------|-----------------|------|
| 21.2.1 | View presets | See preset list | Presets displayed | [ ] |
| 21.2.2 | Load preset | Click preset | Timer configured | [ ] |
| 21.2.3 | Edit preset | Click edit | Editor opens | [ ] |
| 21.2.4 | Add step | Add interval step | Step added | [ ] |
| 21.2.5 | Remove step | Delete step | Step removed | [ ] |
| 21.2.6 | Save preset | Click save | Preset persisted | [ ] |

### 21.3 PWA Features
| # | Test Case | Steps | Expected Result | Pass |
|---|-----------|-------|-----------------|------|
| 21.3.1 | Wake lock | Toggle wake lock | Screen stays on | [ ] |
| 21.3.2 | Mute toggle | Toggle mute | Sounds muted | [ ] |
| 21.3.3 | Installable | Check install prompt | Can install as app | [ ] |
| 21.3.4 | Offline | Disable network | Timer still works | [ ] |

---

## 22. Accessibility

### 22.1 ARIA Labels
| # | Test Case | Steps | Expected Result | Pass |
|---|-----------|-------|-----------------|------|
| 22.1.1 | Form inputs | Inspect inputs | All have aria-label | [ ] |
| 22.1.2 | Buttons | Inspect buttons | Descriptive labels | [ ] |
| 22.1.3 | Checkboxes | Inspect checkboxes | Labels present | [ ] |
| 22.1.4 | Error messages | Trigger error | role="alert" present | [ ] |

### 22.2 Keyboard Navigation
| # | Test Case | Steps | Expected Result | Pass |
|---|-----------|-------|-----------------|------|
| 22.2.1 | Tab navigation | Press Tab | Focus moves logically | [ ] |
| 22.2.2 | Enter to submit | Press Enter on form | Form submits | [ ] |
| 22.2.3 | Escape to close | Press Escape on modal | Modal closes | [ ] |
| 22.2.4 | Focus visible | Tab through | Focus ring visible | [ ] |

### 22.3 Screen Reader
| # | Test Case | Steps | Expected Result | Pass |
|---|-----------|-------|-----------------|------|
| 22.3.1 | Page structure | Use screen reader | Headings announced | [ ] |
| 22.3.2 | Table data | Navigate table | Cells announced | [ ] |
| 22.3.3 | Form errors | Submit invalid | Errors announced | [ ] |

---

## 23. Performance

### 23.1 Page Load Times
| # | Test Case | Target | Actual | Pass |
|---|-----------|--------|--------|------|
| 23.1.1 | Dashboard | < 2s | | [ ] |
| 23.1.2 | Member list | < 2s | | [ ] |
| 23.1.3 | Cohort detail | < 2s | | [ ] |
| 23.1.4 | Reports | < 3s | | [ ] |
| 23.1.5 | Check-in history | < 2s | | [ ] |

### 23.2 React Query Caching
| # | Test Case | Steps | Expected Result | Pass |
|---|-----------|-------|-----------------|------|
| 23.2.1 | Cache hit | Navigate away/back | No re-fetch | [ ] |
| 23.2.2 | Mutation invalidation | Create entry | History updates | [ ] |
| 23.2.3 | Stale time | Wait 5 min | Background refetch | [ ] |

### 23.3 Build Size
| # | Test Case | Target | Actual | Pass |
|---|-----------|--------|--------|------|
| 23.3.1 | First Load JS | < 300KB | | [ ] |
| 23.3.2 | Largest page | < 500KB | | [ ] |

---

## Regression Checklist

After completing all tests, verify these core flows still work:

| # | Flow | Status |
|---|------|--------|
| R1 | Admin can create/edit/delete members | [ ] |
| R2 | Coach can schedule appointments | [ ] |
| R3 | Appointment conflict detection works | [ ] |
| R4 | Bootcamp capacity enforcement works | [ ] |
| R5 | Cohort member management works | [ ] |
| R6 | Invoice generation from appointments works | [ ] |
| R7 | Client can submit daily check-ins | [ ] |
| R8 | Client can complete weekly questionnaires | [ ] |
| R9 | Coach can leave feedback in review queue | [ ] |
| R10 | Reports export CSV/JSON works | [ ] |
| R11 | Email notifications fire correctly | [ ] |
| R12 | Role-based access controls enforced | [ ] |

---

## Test Summary

| Section | Total Tests | Passed | Failed | Blocked |
|---------|-------------|--------|--------|---------|
| 1. Auth | 14 | | | |
| 2. Navigation | 25 | | | |
| 3. Dashboard | 10 | | | |
| 4. Members | 10 | | | |
| 5. Admin Users | 14 | | | |
| 6. Appointments | 18 | | | |
| 7. Client Appointments | 11 | | | |
| 8. Bootcamps | 14 | | | |
| 9. Cohorts | 20 | | | |
| 10. Check-Ins | 18 | | | |
| 11. Questionnaires | 15 | | | |
| 12. Quest Builder | 14 | | | |
| 13. Invoicing | 21 | | | |
| 14. Reports | 18 | | | |
| 15. Review Queue | 16 | | | |
| 16. Settings | 10 | | | |
| 17. HealthKit | 14 | | | |
| 18. Credits | 9 | | | |
| 19. Emails | 7 | | | |
| 20. Error Handling | 13 | | | |
| 21. Timer | 12 | | | |
| 22. Accessibility | 10 | | | |
| 23. Performance | 8 | | | |
| **TOTAL** | **~320** | | | |

---

## Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Tester | | | |
| Developer | | | |
| Product Owner | | | |

---

## Issue Log

| # | Section | Test # | Description | Severity | Status |
|---|---------|--------|-------------|----------|--------|
| 1 | | | | | |
| 2 | | | | | |
| 3 | | | | | |

---

**Testing Status:** Not Started
**Last Test Run:** [Date]
**Environment:** Development / Staging / Production
