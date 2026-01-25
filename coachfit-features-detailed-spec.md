# CoachFit Features: Detailed Implementation Specification

## Overview

This document provides detailed specifications for implementing ALL CoachFit functionality within the unified fitness platform. These features complement the Personal Trainer Planner foundation and create a complete health coaching platform.

**Core CoachFit Features**:
1. ✅ Daily Fitness Data Recording (Entry model)
2. ✅ iOS HealthKit Integration (Workout + SleepRecord models)
3. ✅ Weekly Questionnaire System (QuestionnaireBundle + WeeklyQuestionnaireResponse)
4. ✅ Weekly Questionnaire Reporting for Coaches
5. ✅ Attention Scoring and Insights
6. ✅ Coach Notes and Weekly Review Queue
7. ✅ Multi-week Programs (Cohorts)

---

## 1. Daily Fitness Data Recording

### Database Schema (Already in main spec)

```prisma
model Entry {
  id              Int      @id @default(autoincrement())
  userId          Int
  date            DateTime @default(now())
  
  // Core health metrics
  weight          Float?
  steps           Int?
  calories        Int?
  sleepQuality    Int?     // 1-10 scale
  perceivedStress Int?     // 1-10 scale
  notes           String?
  
  // Custom responses per cohort
  customResponses Json?    // Flexible field for cohort-specific questions
  
  // Data source tracking
  dataSources     Json?    // {"weight": "manual", "steps": "healthkit", "calories": "healthkit"}
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@unique([userId, date])
  @@map("entries")
  @@index([userId, date])
}
```

### API Routes

**GET /api/entries**
- Query params: `userId`, `startDate`, `endDate`, `limit`
- Returns: Array of entries with data sources
- Use case: Fetch entry history for charts

**GET /api/entries/today**
- Returns: Today's entry for current user or null
- Use case: Check if user has already checked in

**POST /api/entries**
- Body: `{ weight?, steps?, calories?, sleepQuality?, perceivedStress?, notes?, customResponses? }`
- Business logic:
  - Check if entry exists for today (unique constraint)
  - If exists, update; if not, create
  - Auto-populate dataSources based on where data came from
- Returns: Created/updated entry

**PATCH /api/entries/[id]**
- Body: Partial entry data
- Returns: Updated entry

**DELETE /api/entries/[id]**
- Only allows deletion of current day's entry
- Returns: Success message

### UI Components

#### DailyCheckInForm.tsx
```typescript
interface DailyCheckInFormProps {
  existingEntry?: Entry | null;
  cohortConfig?: CohortCheckInConfig | null;
}

// Features:
// - Pre-fill with existing data if entry exists for today
// - Show cohort-specific custom questions if user is in a cohort
// - Display data source badges (manual vs HealthKit)
// - Real-time validation with Zod
// - Success toast on save
// - Option to skip fields (all optional)
```

#### CheckInHistory.tsx
```typescript
interface CheckInHistoryProps {
  userId: number;
  dateRange?: { start: Date; end: Date };
}

// Features:
// - Table view of all entries
// - Filter by date range
// - Sort by date (newest first)
// - Click to edit past entries
// - Data source indicators
// - Export to CSV option
```

#### CheckInChart.tsx
```typescript
interface CheckInChartProps {
  userId: number;
  metric: 'weight' | 'steps' | 'calories' | 'sleepQuality' | 'perceivedStress';
  days?: number; // Default 30
}

// Features:
// - Line chart using Recharts
// - Show trend line
// - Highlight data sources (different colors for manual vs HealthKit)
// - Responsive design
// - Tooltips with exact values
// - Toggle between different metrics
```

#### CheckInCalendar.tsx
```typescript
interface CheckInCalendarProps {
  userId: number;
  month: Date;
}

// Features:
// - Calendar view showing check-in completion
// - Green indicator for days with entries
// - Click day to view/edit entry
// - Today highlighted
// - Navigation between months
```

### Business Rules

1. **One Entry Per Day**: Unique constraint `[userId, date]` enforced at DB level
2. **Partial Entries Allowed**: All metrics are optional - users can log what they want
3. **Data Source Tracking**: Every metric tracks if it came from manual input or HealthKit
4. **Custom Responses**: If user is in a cohort with custom check-in questions, store in `customResponses` JSON field
5. **Timezone Handling**: Use user's local timezone for "today" determination

---

## 2. iOS HealthKit Integration

### Database Schema (Already in main spec)

```prisma
model HealthKitWorkout {
  id           Int      @id @default(autoincrement())
  userId       Int
  workoutType  String   // Running, Cycling, Swimming, etc.
  startTime    DateTime
  endTime      DateTime
  duration     Int      // seconds
  calories     Float?
  distance     Float?   // meters
  heartRate    Json?    // {avg: 150, max: 180, min: 120}
  metadata     Json?    // Any additional data from HealthKit
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  createdAt DateTime @default(now())
  
  @@map("healthkit_workouts")
  @@index([userId, startTime])
}

model SleepRecord {
  id            Int      @id @default(autoincrement())
  userId        Int
  startTime     DateTime
  endTime       DateTime
  totalSleep    Int      // minutes
  inBedTime     Int      // minutes
  deepSleep     Int?     // minutes
  remSleep      Int?     // minutes
  coreSleep     Int?     // minutes
  sourceDevice  String?  // "Apple Watch", "iPhone", etc.
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  createdAt DateTime @default(now())
  
  @@map("sleep_records")
  @@index([userId, startTime])
}
```

### API Routes

**POST /api/healthkit/workouts**
- Body: Array of workout objects
- Headers: `X-Pairing-Code` for authentication
- Business logic:
  - Verify pairing code matches user
  - Bulk insert workouts (deduplicate by startTime)
  - Update Entry.calories if workout is from today
  - Mark data source as "healthkit"
- Returns: `{ inserted: number, updated: number }`

**POST /api/healthkit/sleep**
- Body: Array of sleep record objects
- Headers: `X-Pairing-Code` for authentication
- Business logic:
  - Verify pairing code
  - Bulk insert sleep records
  - Update Entry.sleepQuality based on sleep score calculation
  - Mark data source as "healthkit"
- Returns: `{ inserted: number, updated: number }`

**GET /api/healthkit/workouts**
- Query params: `userId`, `startDate`, `endDate`
- Returns: Array of workouts
- Use case: Coach viewing client's workout history

**GET /api/healthkit/sleep**
- Query params: `userId`, `startDate`, `endDate`
- Returns: Array of sleep records
- Use case: Coach viewing client's sleep patterns

**POST /api/healthkit/pair**
- Body: `{ userId, email }` (email for verification)
- Business logic:
  - Generate random 6-digit pairing code
  - Store in User.metadata JSON field with expiry (24 hours)
- Returns: `{ pairingCode: "123456", expiresAt: "..." }`

### Pairing Code System

```typescript
// lib/healthkit-pairing.ts

interface PairingCode {
  code: string;
  userId: number;
  createdAt: Date;
  expiresAt: Date;
}

export async function generatePairingCode(userId: number): Promise<string> {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  
  await prisma.user.update({
    where: { id: userId },
    data: {
      metadata: {
        healthkit_pairing: {
          code,
          expiresAt: expiresAt.toISOString()
        }
      }
    }
  });
  
  return code;
}

export async function verifyPairingCode(code: string): Promise<number | null> {
  const user = await prisma.user.findFirst({
    where: {
      metadata: {
        path: ['healthkit_pairing', 'code'],
        equals: code
      }
    }
  });
  
  if (!user) return null;
  
  const pairing = user.metadata?.healthkit_pairing;
  if (!pairing || new Date(pairing.expiresAt) < new Date()) {
    return null;
  }
  
  return user.id;
}
```

### UI Components

#### HealthKitPairingInstructions.tsx
```typescript
// Features:
// - Display 6-digit pairing code prominently
// - Show expiry countdown
// - Step-by-step iOS app instructions
// - QR code option for easy pairing
// - "Generate New Code" button
```

#### HealthKitDataExplorer.tsx
```typescript
interface HealthKitDataExplorerProps {
  userId: number;
}

// Features:
// - Tabs: Workouts | Sleep | Steps | Heart Rate
// - Date range picker
// - Charts for each data type
// - Table view with raw data
// - Export to CSV
// - Filter by workout type
```

#### WorkoutTimeline.tsx
```typescript
interface WorkoutTimelineProps {
  workouts: HealthKitWorkout[];
}

// Features:
// - Timeline visualization
// - Color-coded by workout type
// - Show duration, calories, distance
// - Click to expand details
// - Group by week
```

### Business Rules

1. **Pairing Code Security**: Codes expire after 24 hours, one active code per user
2. **Data Deduplication**: Use `startTime` as unique identifier to prevent duplicate imports
3. **Automatic Entry Updates**: When HealthKit data arrives, update corresponding Entry fields
4. **Data Source Tracking**: Always mark imported data with "healthkit" source
5. **Privacy**: Only coaches assigned to user's cohorts can view HealthKit data

---

## 3. Weekly Questionnaire System

### Database Schema (Already in main spec)

```prisma
model QuestionnaireBundle {
  id          Int      @id @default(autoincrement())
  cohortId    Int
  weekNumber  Int      // Week 1, 2, 3, etc. (from cohort start date)
  questions   Json     // SurveyJS format
  isActive    Boolean  @default(true)
  
  cohort    Cohort @relation(fields: [cohortId], references: [id], onDelete: Cascade)
  responses WeeklyQuestionnaireResponse[]
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@unique([cohortId, weekNumber])
  @@map("questionnaire_bundles")
}

model WeeklyQuestionnaireResponse {
  id         Int      @id @default(autoincrement())
  userId     Int
  bundleId   Int
  weekNumber Int
  responses  Json     // User's answers in SurveyJS format
  status     ResponseStatus @default(IN_PROGRESS)
  
  user   User                @relation(fields: [userId], references: [id], onDelete: Cascade)
  bundle QuestionnaireBundle @relation(fields: [bundleId], references: [id], onDelete: Cascade)
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  completedAt DateTime? // When status changed to COMPLETED
  
  @@unique([userId, bundleId])
  @@map("weekly_questionnaire_responses")
}

enum ResponseStatus {
  IN_PROGRESS
  COMPLETED
}
```

### SurveyJS Integration

**Questions JSON Format**:
```json
{
  "title": "Week 1 Check-In",
  "description": "How are you feeling after your first week?",
  "pages": [
    {
      "name": "page1",
      "elements": [
        {
          "type": "rating",
          "name": "energy_level",
          "title": "How would you rate your energy level this week?",
          "rateMin": 1,
          "rateMax": 10
        },
        {
          "type": "comment",
          "name": "biggest_challenge",
          "title": "What was your biggest challenge this week?"
        },
        {
          "type": "checkbox",
          "name": "goals_achieved",
          "title": "Which goals did you achieve?",
          "choices": [
            "Exercised 3+ times",
            "Ate healthy meals",
            "Got 7+ hours sleep",
            "Practiced mindfulness"
          ]
        }
      ]
    }
  ]
}
```

**Responses JSON Format**:
```json
{
  "energy_level": 8,
  "biggest_challenge": "Staying consistent with morning workouts",
  "goals_achieved": ["Exercised 3+ times", "Got 7+ hours sleep"]
}
```

### API Routes

**GET /api/questionnaires**
- Query params: `cohortId`, `weekNumber?`
- Returns: Array of questionnaire bundles
- Use case: Admin viewing all questionnaires for a cohort

**GET /api/questionnaires/available**
- Query params: `userId`
- Returns: Array of available questionnaires for user's current week
- Business logic:
  - Get user's cohort memberships
  - Calculate current week number from cohort start date
  - Return bundles for current week that user hasn't completed
- Use case: Client checking what questionnaires they need to fill out

**POST /api/questionnaires**
- Body: `{ cohortId, weekNumber, questions (SurveyJS JSON) }`
- Returns: Created bundle
- Authorization: ADMIN or COACH role only

**GET /api/questionnaires/responses**
- Query params: `bundleId`, `cohortId?`, `weekNumber?`
- Returns: Array of responses with user details
- Use case: Coach reviewing all responses for a week

**POST /api/questionnaires/responses**
- Body: `{ bundleId, responses (SurveyJS JSON), status }`
- Business logic:
  - Upsert (create or update) based on unique constraint
  - Set completedAt if status is COMPLETED
  - Send notification to assigned coaches
- Returns: Created/updated response

### UI Components

#### QuestionnaireBuilder.tsx
```typescript
interface QuestionnaireBuilderProps {
  cohortId: number;
  weekNumber: number;
  existingBundle?: QuestionnaireBundle | null;
}

// Features:
// - SurveyJS Creator integration
// - Drag-and-drop question builder
// - Question types: rating, checkbox, radio, text, comment, matrix
// - Preview mode
// - Save as draft or publish
// - Clone from previous week
// - Template library
```

#### QuestionnaireForm.tsx
```typescript
interface QuestionnaireFormProps {
  bundle: QuestionnaireBundle;
  existingResponse?: WeeklyQuestionnaireResponse | null;
}

// Features:
// - SurveyJS React component
// - Auto-save progress (IN_PROGRESS status)
// - Resume partially completed questionnaires
// - Submit as final (COMPLETED status)
// - Progress indicator
// - Validation before submission
```

#### ResponseAnalytics.tsx
```typescript
interface ResponseAnalyticsProps {
  bundleId: number;
  responses: WeeklyQuestionnaireResponse[];
}

// Features:
// - Aggregate statistics for each question
// - Rating averages with standard deviation
// - Word clouds for text responses
// - Checkbox/radio choice distributions (bar charts)
// - Export to CSV
// - Filter by cohort member
// - Compare week-over-week trends
```

#### CoachWeeklyReviewQueue.tsx
```typescript
interface CoachWeeklyReviewQueueProps {
  coachId: number;
}

// Features:
// - List all completed questionnaires needing review
// - Group by cohort
// - Sort by completion date
// - Mark as "reviewed"
// - Quick navigation to individual responses
// - Attention score badges
// - Filter by week number
```

### Business Rules

1. **Week Calculation**: Week number is calculated from cohort `startDate`
   ```typescript
   function getCurrentWeek(cohortStartDate: Date): number {
     const now = new Date();
     const diffTime = Math.abs(now.getTime() - cohortStartDate.getTime());
     const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
     return Math.ceil(diffDays / 7);
   }
   ```

2. **Availability Window**: Questionnaires are available for the current week only (from Monday to Sunday of that week)

3. **One Response Per Bundle**: Unique constraint `[userId, bundleId]` prevents duplicate submissions

4. **Auto-save**: Form saves as IN_PROGRESS every 30 seconds while user is typing

5. **Completion**: Status changes to COMPLETED when user clicks "Submit Final" button

6. **Coach Notification**: When a response is completed, notify all coaches assigned to that cohort

---

## 4. Weekly Questionnaire Reporting for Coaches

### Database Query Examples

```typescript
// Get all responses for a specific week across cohorts
async function getWeeklyResponses(coachId: number, weekNumber: number) {
  return await prisma.weeklyQuestionnaireResponse.findMany({
    where: {
      weekNumber,
      bundle: {
        cohort: {
          coaches: {
            some: { coachId }
          }
        }
      },
      status: 'COMPLETED'
    },
    include: {
      user: {
        select: { id: true, name: true, email: true, image: true }
      },
      bundle: {
        include: {
          cohort: { select: { id: true, name: true } }
        }
      }
    },
    orderBy: { completedAt: 'desc' }
  });
}

// Get completion rates for a cohort
async function getCompletionRates(cohortId: number, weekNumber: number) {
  const totalMembers = await prisma.cohortMembership.count({
    where: { cohortId, status: 'ACTIVE' }
  });
  
  const completedResponses = await prisma.weeklyQuestionnaireResponse.count({
    where: {
      weekNumber,
      status: 'COMPLETED',
      bundle: { cohortId }
    }
  });
  
  return {
    total: totalMembers,
    completed: completedResponses,
    percentage: (completedResponses / totalMembers) * 100
  };
}
```

### UI Components

#### WeeklyReportDashboard.tsx
```typescript
interface WeeklyReportDashboardProps {
  coachId: number;
  weekNumber?: number; // Default to current week
}

// Features:
// - Overview cards: Total responses, Completion rate, Avg response time
// - Filter by cohort
// - Week selector (dropdown or calendar)
// - Export full report to PDF
// - Charts:
//   - Completion rate trend (line chart)
//   - Response distribution by question (bar charts)
//   - Word clouds for open-ended questions
// - Quick links to individual client responses
```

#### ClientResponseDetail.tsx
```typescript
interface ClientResponseDetailProps {
  responseId: number;
}

// Features:
// - Display all questions and user's answers
// - Side-by-side comparison with previous weeks
// - Trend indicators (↑ ↓ →)
// - Add coach notes section
// - Flag for follow-up
// - Send message to client
// - Export to PDF
```

#### CohortComparisonView.tsx
```typescript
interface CohortComparisonViewProps {
  cohortIds: number[];
  weekNumber: number;
}

// Features:
// - Side-by-side comparison of multiple cohorts
// - Aggregate statistics for each cohort
// - Identify high/low performing cohorts
// - Common themes in text responses
// - Outlier detection
```

---

## 5. Attention Scoring and Insights

### Attention Score Calculation Algorithm

The attention score is a 0-100 metric that helps coaches prioritize which clients need attention most urgently.

**Factors**:
1. **Check-in Consistency** (30 points)
   - 7-day streak: 30 points
   - 5-6 days: 20 points
   - 3-4 days: 10 points
   - 1-2 days: 5 points
   - 0 days: 0 points (red flag!)

2. **Questionnaire Completion** (25 points)
   - Completed on time: 25 points
   - Completed late (within 3 days): 15 points
   - Not completed: 0 points

3. **Negative Sentiment** (20 points)
   - Detect negative keywords in responses
   - Stress score >= 8: -10 points
   - Sleep quality <= 3: -10 points
   - Keywords like "struggling", "difficult", "frustrated": -5 points each

4. **Engagement Trend** (15 points)
   - Increasing engagement: +15 points
   - Stable engagement: +10 points
   - Declining engagement: 0 points

5. **Goals Achievement** (10 points)
   - Based on questionnaire checkbox responses
   - % of goals achieved translates to points

**Total Score**: Sum all factors, capped at 0-100
- **80-100**: Green (doing great)
- **50-79**: Yellow (monitor)
- **0-49**: Red (needs attention!)

### Database Implementation

```prisma
// Add to User model (computed field)
// Or create a separate AttentionScore model for historical tracking

model AttentionScore {
  id              Int      @id @default(autoincrement())
  userId          Int
  weekNumber      Int
  score           Int      // 0-100
  factors         Json     // Breakdown of score components
  recommendedAction String? // Auto-generated suggestion
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  createdAt DateTime @default(now())
  
  @@unique([userId, weekNumber])
  @@map("attention_scores")
  @@index([score]) // For ranking
}
```

### Calculation Service

```typescript
// lib/attention-score.ts

interface AttentionScoreBreakdown {
  checkInConsistency: number;
  questionnaireCompletion: number;
  sentiment: number;
  engagement: number;
  goalsAchievement: number;
  total: number;
}

export async function calculateAttentionScore(
  userId: number,
  weekNumber: number
): Promise<AttentionScoreBreakdown> {
  const weekStart = getWeekStart(weekNumber);
  const weekEnd = getWeekEnd(weekNumber);
  
  // 1. Check-in Consistency
  const checkIns = await prisma.entry.count({
    where: {
      userId,
      date: { gte: weekStart, lte: weekEnd }
    }
  });
  const checkInScore = Math.min(checkIns * 5, 30); // Max 30 points
  
  // 2. Questionnaire Completion
  const questionnaire = await prisma.weeklyQuestionnaireResponse.findFirst({
    where: {
      userId,
      weekNumber,
      status: 'COMPLETED'
    }
  });
  const questionnaireScore = questionnaire ? 25 : 0;
  
  // 3. Sentiment Analysis
  const entries = await prisma.entry.findMany({
    where: {
      userId,
      date: { gte: weekStart, lte: weekEnd }
    }
  });
  
  let sentimentScore = 20; // Start neutral
  entries.forEach(entry => {
    if (entry.perceivedStress && entry.perceivedStress >= 8) sentimentScore -= 10;
    if (entry.sleepQuality && entry.sleepQuality <= 3) sentimentScore -= 10;
    if (entry.notes?.match(/(struggling|difficult|frustrated|hard|can't)/i)) {
      sentimentScore -= 5;
    }
  });
  sentimentScore = Math.max(sentimentScore, 0);
  
  // 4. Engagement Trend
  const lastWeekCheckIns = await prisma.entry.count({
    where: {
      userId,
      date: { gte: getPreviousWeekStart(weekNumber), lte: getPreviousWeekEnd(weekNumber) }
    }
  });
  let engagementScore = 10; // Neutral
  if (checkIns > lastWeekCheckIns) engagementScore = 15; // Improving
  if (checkIns < lastWeekCheckIns) engagementScore = 0; // Declining
  
  // 5. Goals Achievement
  let goalsScore = 10; // Default
  if (questionnaire?.responses?.goals_achieved) {
    const goalsCount = questionnaire.responses.goals_achieved.length || 0;
    goalsScore = Math.min(goalsCount * 2.5, 10);
  }
  
  const total = checkInScore + questionnaireScore + sentimentScore + engagementScore + goalsScore;
  
  return {
    checkInConsistency: checkInScore,
    questionnaireCompletion: questionnaireScore,
    sentiment: sentimentScore,
    engagement: engagementScore,
    goalsAchievement: goalsScore,
    total: Math.min(Math.max(total, 0), 100)
  };
}

// Auto-generate recommendations
export function getRecommendedAction(score: number, breakdown: AttentionScoreBreakdown): string {
  if (score >= 80) return "Client is thriving! Send positive reinforcement.";
  
  if (breakdown.checkInConsistency < 15) {
    return "Check-in consistency is low. Send reminder and check if they need support.";
  }
  
  if (breakdown.questionnaireCompletion === 0) {
    return "Questionnaire not completed. Follow up to understand barriers.";
  }
  
  if (breakdown.sentiment < 10) {
    return "Client showing signs of stress. Schedule 1-on-1 check-in call.";
  }
  
  if (breakdown.engagement === 0) {
    return "Engagement declining. Reach out to re-motivate and adjust plan if needed.";
  }
  
  return "Monitor progress and provide encouragement.";
}
```

### Automated Calculation

Run this as a **weekly cron job** (every Monday at 12am):

```typescript
// app/api/cron/calculate-attention-scores/route.ts

export async function POST(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  const currentWeek = getCurrentWeekNumber();
  
  // Get all active cohort members
  const members = await prisma.cohortMembership.findMany({
    where: { status: 'ACTIVE' },
    include: { user: true }
  });
  
  for (const member of members) {
    const breakdown = await calculateAttentionScore(member.userId, currentWeek);
    const action = getRecommendedAction(breakdown.total, breakdown);
    
    await prisma.attentionScore.upsert({
      where: {
        userId_weekNumber: {
          userId: member.userId,
          weekNumber: currentWeek
        }
      },
      create: {
        userId: member.userId,
        weekNumber: currentWeek,
        score: breakdown.total,
        factors: breakdown,
        recommendedAction: action
      },
      update: {
        score: breakdown.total,
        factors: breakdown,
        recommendedAction: action
      }
    });
  }
  
  return new Response(JSON.stringify({ success: true, processed: members.length }));
}
```

### UI Components

#### AttentionScoreDashboard.tsx
```typescript
interface AttentionScoreDashboardProps {
  coachId: number;
}

// Features:
// - List all clients sorted by attention score (lowest first)
// - Color-coded badges (red: 0-49, yellow: 50-79, green: 80-100)
// - Show recommended action for each client
// - Filter by cohort
// - Quick action buttons:
//   - Send message
//   - Add coach note
//   - Schedule call
// - Trend chart showing score over weeks
// - Export priority list to PDF
```

#### ClientAttentionDetail.tsx
```typescript
interface ClientAttentionDetailProps {
  userId: number;
  weekNumber: number;
}

// Features:
// - Pie chart showing score breakdown
// - Line chart of score trend over time
// - List of contributing factors
// - Recommended action card
// - Quick links to:
//   - View check-in history
//   - View questionnaire responses
//   - View coach notes
// - Add note section
```

#### PriorityClientsList.tsx
```typescript
interface PriorityClientsListProps {
  coachId: number;
  threshold?: number; // Default 50 (show clients below this score)
}

// Features:
// - Sorted list of clients needing attention
// - Avatar, name, score badge
// - Last check-in date
// - Last questionnaire completion
// - Click to open client detail
// - Batch actions (send reminder to all, etc.)
```

---

## 6. Coach Notes and Weekly Review Queue

### Database Schema

```prisma
model CoachNote {
  id        Int      @id @default(autoincrement())
  userId    Int      // Client being noted about
  coachId   Int      // Coach who wrote the note
  cohortId  Int?     // Optional: link to specific cohort
  weekNumber Int?    // Optional: link to specific week
  
  title     String?
  content   String   // Markdown supported
  isPrivate Boolean  @default(true) // Private to coach vs shared with client
  tags      String[] // ["follow-up", "nutrition", "motivation", etc.]
  
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  cohort Cohort? @relation(fields: [cohortId], references: [id], onDelete: SetNull)
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@map("coach_notes")
  @@index([userId, weekNumber])
  @@index([coachId, createdAt])
}

// Add to User model
model User {
  // ... existing fields
  coachNotesWritten CoachNote[] @relation("CoachNotesWritten") // Notes this user wrote (if they're a coach)
  coachNotesReceived CoachNote[] // Notes about this user (if they're a client)
}
```

### Review Queue System

```prisma
model WeeklyReviewQueue {
  id              Int      @id @default(autoincrement())
  coachId         Int
  userId          Int      // Client to review
  weekNumber      Int
  status          ReviewStatus @default(PENDING)
  priority        Int      @default(5) // 1-10, auto-populated from attention score
  
  // Auto-populated from calculations
  checkInsCompleted Int
  questionnaireCompleted Boolean
  attentionScore   Int?
  
  reviewedAt      DateTime?
  reviewNotes     String?  // Quick notes from coach
  
  coach  User @relation("ReviewQueueCoach", fields: [coachId], references: [id], onDelete: Cascade)
  client User @relation("ReviewQueueClient", fields: [userId], references: [id], onDelete: Cascade)
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@unique([coachId, userId, weekNumber])
  @@map("weekly_review_queue")
  @@index([coachId, status, priority])
}

enum ReviewStatus {
  PENDING
  IN_PROGRESS
  COMPLETED
  SKIPPED
}
```

### Automated Queue Population

Run this **weekly cron job** (every Monday at 1am, after attention scores are calculated):

```typescript
// app/api/cron/populate-review-queue/route.ts

export async function POST(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  const currentWeek = getCurrentWeekNumber();
  
  // Get all coach-client pairs from active cohorts
  const cohorts = await prisma.cohort.findMany({
    where: { status: 'ACTIVE' },
    include: {
      coaches: { include: { coach: true } },
      members: { 
        where: { status: 'ACTIVE' },
        include: { user: true }
      }
    }
  });
  
  for (const cohort of cohorts) {
    for (const coachMembership of cohort.coaches) {
      for (const clientMembership of cohort.members) {
        // Get attention score for priority
        const attentionScore = await prisma.attentionScore.findUnique({
          where: {
            userId_weekNumber: {
              userId: clientMembership.userId,
              weekNumber: currentWeek
            }
          }
        });
        
        // Get check-ins
        const weekStart = getWeekStart(currentWeek);
        const weekEnd = getWeekEnd(currentWeek);
        const checkInsCount = await prisma.entry.count({
          where: {
            userId: clientMembership.userId,
            date: { gte: weekStart, lte: weekEnd }
          }
        });
        
        // Get questionnaire completion
        const questionnaireCompleted = await prisma.weeklyQuestionnaireResponse.findFirst({
          where: {
            userId: clientMembership.userId,
            weekNumber: currentWeek,
            status: 'COMPLETED'
          }
        }) !== null;
        
        // Calculate priority (inverse of attention score)
        const priority = attentionScore 
          ? Math.ceil((100 - attentionScore.score) / 10) // 0-100 score -> 10-1 priority
          : 5; // Default middle priority
        
        // Upsert review queue item
        await prisma.weeklyReviewQueue.upsert({
          where: {
            coachId_userId_weekNumber: {
              coachId: coachMembership.coachId,
              userId: clientMembership.userId,
              weekNumber: currentWeek
            }
          },
          create: {
            coachId: coachMembership.coachId,
            userId: clientMembership.userId,
            weekNumber: currentWeek,
            priority,
            checkInsCompleted: checkInsCount,
            questionnaireCompleted,
            attentionScore: attentionScore?.score
          },
          update: {
            priority,
            checkInsCompleted: checkInsCount,
            questionnaireCompleted,
            attentionScore: attentionScore?.score
          }
        });
      }
    }
  }
  
  return new Response(JSON.stringify({ success: true }));
}
```

### API Routes

**GET /api/coach/review-queue**
- Query params: `coachId`, `status?`, `weekNumber?`
- Returns: Array of review queue items sorted by priority
- Use case: Coach viewing their weekly review queue

**PATCH /api/coach/review-queue/[id]**
- Body: `{ status, reviewNotes? }`
- Returns: Updated review queue item
- Use case: Coach marking review as completed

**GET /api/coach/notes**
- Query params: `coachId?`, `userId?`, `cohortId?`, `weekNumber?`
- Returns: Array of coach notes with filters
- Use case: Viewing all notes for a client or cohort

**POST /api/coach/notes**
- Body: `{ userId, cohortId?, weekNumber?, title?, content, isPrivate, tags[] }`
- Returns: Created coach note
- Use case: Coach adding notes during review

**PATCH /api/coach/notes/[id]**
- Body: Partial note data
- Returns: Updated coach note

**DELETE /api/coach/notes/[id]**
- Returns: Success message

### UI Components

#### WeeklyReviewQueue.tsx
```typescript
interface WeeklyReviewQueueProps {
  coachId: number;
  weekNumber?: number; // Default to current week
}

// Features:
// - Table of clients to review
// - Columns:
//   - Client name + avatar
//   - Priority badge (1-10, color-coded)
//   - Check-ins completed (7/7 ✓ or 3/7 ⚠)
//   - Questionnaire status (✓ or ✗)
//   - Attention score badge
//   - Status (Pending, In Progress, Completed)
//   - Quick actions (Start Review, Skip)
// - Sort by priority (highest first)
// - Filter by status
// - Bulk actions (mark multiple as reviewed)
// - Progress indicator (e.g., "12/45 reviewed")
```

#### ClientReviewPanel.tsx
```typescript
interface ClientReviewPanelProps {
  reviewQueueId: number;
}

// Features:
// - Left panel:
//   - Client info card
//   - Attention score breakdown
//   - Check-in summary (with chart)
//   - Questionnaire responses
// - Right panel:
//   - Previous coach notes (chronological)
//   - Add new note form (title, content, tags, private/shared)
//   - Recommended action from attention score
// - Bottom:
//   - "Mark as Reviewed" button
//   - "Schedule Follow-up" button
//   - "Send Message" button
// - Keyboard shortcuts:
//   - N: Add note
//   - R: Mark reviewed
//   - →: Next client
//   - ←: Previous client
```

#### CoachNotesTimeline.tsx
```typescript
interface CoachNotesTimelineProps {
  userId: number;
  cohortId?: number;
}

// Features:
// - Chronological timeline of all notes
// - Group by week or month
// - Show note content (expandable)
// - Tags as badges
// - Private/shared indicator
// - Edit/delete buttons (for note author only)
// - Search/filter by tags or date range
// - Export to PDF
```

#### QuickNoteWidget.tsx
```typescript
interface QuickNoteWidgetProps {
  userId: number;
  onSave?: () => void;
}

// Features:
// - Minimal form: content textarea + tags
// - Auto-save draft
// - Markdown preview
// - Template suggestions
// - Voice-to-text option (browser speech recognition)
// - Save and close
```

### Review Workflow

1. **Monday Morning**:
   - Cron jobs run overnight
   - Attention scores calculated
   - Review queue populated
   - Coaches receive email: "You have 15 clients to review this week"

2. **During the Week**:
   - Coach opens review queue dashboard
   - Clients sorted by priority (lowest attention scores first)
   - Coach clicks "Start Review" on a client
   - Review panel opens with all relevant data
   - Coach reads through check-ins, questionnaire, previous notes
   - Coach adds notes as needed
   - Coach marks review as completed
   - System moves to next client automatically

3. **End of Week**:
   - Coach dashboard shows completion percentage
   - Option to export review summary for records
   - Unreviewed clients roll over to next week (escalated priority)

---

## 7. Multi-week Programs (Cohorts)

### Database Schema (Already in main spec)

```prisma
model Cohort {
  id          Int      @id @default(autoincrement())
  name        String
  description String?
  startDate   DateTime
  endDate     DateTime?
  status      CohortStatus @default(ACTIVE)
  
  // Program structure
  totalWeeks  Int?     // Expected duration
  
  coaches     CoachCohortMembership[]
  members     CohortMembership[]
  bundles     QuestionnaireBundle[]
  config      CohortCheckInConfig?
  insights    AdminInsight[]
  notes       CoachNote[]
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@map("cohorts")
  @@index([status, startDate])
}

model CohortCheckInConfig {
  id        Int    @id @default(autoincrement())
  cohortId  Int    @unique
  prompts   Json   // Custom check-in questions beyond the standard ones
  
  cohort Cohort @relation(fields: [cohortId], references: [id], onDelete: Cascade)
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@map("cohort_check_in_configs")
}
```

**Custom Prompts JSON Example**:
```json
{
  "questions": [
    {
      "id": "nutrition_tracking",
      "label": "Did you track your nutrition today?",
      "type": "boolean"
    },
    {
      "id": "water_intake",
      "label": "How many glasses of water did you drink?",
      "type": "number",
      "min": 0,
      "max": 20
    },
    {
      "id": "energy_level",
      "label": "How's your energy level?",
      "type": "scale",
      "min": 1,
      "max": 10
    },
    {
      "id": "mindfulness_practice",
      "label": "Did you practice mindfulness?",
      "type": "boolean"
    }
  ]
}
```

These custom responses are stored in `Entry.customResponses`:
```json
{
  "nutrition_tracking": true,
  "water_intake": 8,
  "energy_level": 7,
  "mindfulness_practice": false
}
```

### API Routes

**GET /api/cohorts**
- Query params: `status?`, `coachId?`
- Returns: Array of cohorts
- Use case: Listing all cohorts or filtering by coach

**POST /api/cohorts**
- Body: `{ name, description?, startDate, endDate?, totalWeeks? }`
- Returns: Created cohort
- Authorization: ADMIN only

**GET /api/cohorts/[id]**
- Returns: Cohort with members, coaches, config
- Use case: Cohort detail page

**PATCH /api/cohorts/[id]**
- Body: Partial cohort data
- Returns: Updated cohort

**POST /api/cohorts/[id]/members**
- Body: `{ userIds: number[] }`
- Business logic: Create CohortMembership records
- Returns: Updated cohort with new members

**DELETE /api/cohorts/[id]/members/[userId]**
- Business logic: Set CohortMembership.status = INACTIVE
- Returns: Success message

**POST /api/cohorts/[id]/coaches**
- Body: `{ coachIds: number[] }`
- Returns: Updated cohort with new coaches

**DELETE /api/cohorts/[id]/coaches/[coachId]**
- Returns: Success message

**POST /api/cohorts/[id]/config**
- Body: `{ prompts (JSON) }`
- Returns: Created/updated config

### UI Components

#### CohortForm.tsx
```typescript
interface CohortFormProps {
  cohort?: Cohort | null; // For editing
}

// Features:
// - Name, description fields
// - Date pickers for start/end dates
// - Total weeks input
// - Status selector (ACTIVE, COMPLETED, ARCHIVED)
// - Save button
```

#### CohortDetail.tsx
```typescript
interface CohortDetailProps {
  cohortId: number;
}

// Features:
// - Tabs:
//   - Overview (description, dates, stats)
//   - Members (list with status badges)
//   - Coaches (list with contact info)
//   - Questionnaires (week-by-week list)
//   - Check-in Config (custom questions)
//   - Analytics (completion rates, engagement)
// - Actions:
//   - Edit cohort
//   - Add members
//   - Add coaches
//   - Create questionnaire
//   - Configure check-ins
//   - Archive cohort
```

#### MemberManagement.tsx
```typescript
interface MemberManagementProps {
  cohortId: number;
}

// Features:
// - Table of current members
// - Status badges (ACTIVE, PAUSED, INACTIVE)
// - Add member button (opens user search modal)
// - Bulk actions (pause, activate, remove)
// - Export member list to CSV
// - Member detail links
```

#### CoachAssignment.tsx
```typescript
interface CoachAssignmentProps {
  cohortId: number;
}

// Features:
// - List of assigned coaches
// - Add coach button (dropdown of available coaches)
// - Remove coach button
// - Primary coach designation (optional)
// - Coach workload indicator (how many clients they have)
```

#### CheckInConfigEditor.tsx
```typescript
interface CheckInConfigEditorProps {
  cohortId: number;
  config?: CohortCheckInConfig | null;
}

// Features:
// - Add/remove custom questions
// - Question types: boolean, number, scale, text
// - Preview of check-in form
// - Reorder questions (drag-and-drop)
// - Save config
// - Clone from another cohort
```

### Business Rules

1. **Week Calculation**: All week numbers are relative to cohort `startDate`
   - Week 1: `startDate` to `startDate + 6 days`
   - Week 2: `startDate + 7 days` to `startDate + 13 days`
   - And so on...

2. **Cohort Status**:
   - **ACTIVE**: Currently running, clients can check in and complete questionnaires
   - **COMPLETED**: Program finished, read-only mode, analytics available
   - **ARCHIVED**: Hidden from main views, only accessible via direct link

3. **Member Status**:
   - **ACTIVE**: Participating normally
   - **PAUSED**: Temporarily suspended (e.g., injury, travel), doesn't count toward completion rates
   - **INACTIVE**: Left the program, excluded from all calculations

4. **Custom Check-in Questions**: Max 10 custom questions per cohort (to keep forms manageable)

5. **Questionnaire Creation**: Admins/coaches can create questionnaires for future weeks, but they only become available during that week

---

## Integration Points

### How All Features Work Together

1. **Client Daily Routine**:
   - Wake up → HealthKit syncs overnight data automatically
   - Open app → See daily check-in reminder
   - Complete check-in → Manual data + HealthKit data combined
   - Monday → Weekly questionnaire becomes available
   - Complete questionnaire → Coach notified

2. **Coach Weekly Routine**:
   - Monday morning → Review queue populated with all clients
   - Review queue sorted by attention score (lowest first)
   - Click client → See all data: check-ins, questionnaires, HealthKit, notes
   - Add notes → Track observations and action items
   - Mark as reviewed → Move to next client
   - End of week → Export summary report

3. **Admin Monthly Routine**:
   - View cohort analytics → Identify struggling clients
   - View completion rates → Identify engagement issues
   - Review attention score trends → Allocate coach resources
   - Generate billing reports → Track revenue
   - Create new cohorts → Onboard new clients

### Data Flow Diagram

```
┌─────────────┐
│   Client    │
│   (iOS App) │
└──────┬──────┘
       │
       │ 1. HealthKit Data
       ↓
┌──────────────────────────────────┐
│  POST /api/healthkit/workouts    │
│  POST /api/healthkit/sleep       │
└────────────┬─────────────────────┘
             │
             │ 2. Store in DB
             ↓
┌────────────────────────────────────┐
│  HealthKitWorkout & SleepRecord    │
│  models                            │
└────────────┬───────────────────────┘
             │
             │ 3. Auto-populate Entry
             ↓
┌────────────────────────────────────┐
│  Entry model (today's entry)       │
│  dataSources: {"steps": "healthkit"}│
└────────────┬───────────────────────┘
             │
             │ 4. Client manual check-in
             ↓
┌────────────────────────────────────┐
│  POST /api/entries                 │
│  Adds manual data + custom responses│
└────────────┬───────────────────────┘
             │
             │ 5. Monday: Weekly questionnaire
             ↓
┌────────────────────────────────────┐
│  POST /api/questionnaires/responses│
│  Stores in WeeklyQuestionnaireResponse│
└────────────┬───────────────────────┘
             │
             │ 6. Cron job (Monday 12am)
             ↓
┌────────────────────────────────────┐
│  Calculate Attention Scores        │
│  (based on check-ins, questionnaires,│
│   sentiment, engagement)           │
└────────────┬───────────────────────┘
             │
             │ 7. Cron job (Monday 1am)
             ↓
┌────────────────────────────────────┐
│  Populate Review Queue             │
│  (sorted by attention score)       │
└────────────┬───────────────────────┘
             │
             │ 8. Coach logs in
             ↓
┌────────────────────────────────────┐
│  GET /api/coach/review-queue       │
│  Opens ClientReviewPanel           │
└────────────┬───────────────────────┘
             │
             │ 9. Coach reviews client
             ↓
┌────────────────────────────────────┐
│  POST /api/coach/notes             │
│  PATCH /api/coach/review-queue/[id]│
│  (status = COMPLETED)              │
└────────────────────────────────────┘
```

---

## Implementation Checklist

### Phase 6: Daily Check-In System ✅
- [ ] Create Entry model with unique constraint
- [ ] Build entry CRUD API routes
- [ ] Create DailyCheckInForm component
- [ ] Build CheckInHistory component
- [ ] Create CheckInChart component with Recharts
- [ ] Implement custom response fields (JSON)
- [ ] Add data source tracking UI
- [ ] Build check-in reminder system

### Phase 7: Weekly Questionnaires ✅
- [ ] Create QuestionnaireBundle and Response models
- [ ] Build questionnaire CRUD API routes
- [ ] Integrate SurveyJS for form building
- [ ] Create QuestionnaireBuilder component
- [ ] Build QuestionnaireForm component
- [ ] Implement week-based availability logic
- [ ] Create ResponseAnalytics component
- [ ] Build CoachWeeklyReviewQueue component

### Phase 10: Analytics & Insights ✅
- [ ] Create AttentionScore model
- [ ] Implement attention score calculation algorithm
- [ ] Build calculateAttentionScore service
- [ ] Create cron job for weekly score calculation
- [ ] Build AttentionScoreDashboard component
- [ ] Create ClientAttentionDetail component
- [ ] Build PriorityClientsList component
- [ ] Implement sentiment analysis for text responses

### Phase 11: HealthKit Integration ✅
- [ ] Create HealthKitWorkout model
- [ ] Create SleepRecord model
- [ ] Build HealthKit data ingestion API
- [ ] Implement pairing code system
- [ ] Create HealthKitPairingInstructions component
- [ ] Build HealthKitDataExplorer component
- [ ] Create WorkoutTimeline component
- [ ] Add data source badges to check-in forms
- [ ] Implement automatic Entry updates from HealthKit data

### Coach Notes & Review Queue (New - Part of Phase 10)
- [ ] Create CoachNote model
- [ ] Create WeeklyReviewQueue model
- [ ] Build coach notes CRUD API routes
- [ ] Build review queue API routes
- [ ] Create cron job to populate review queue
- [ ] Build WeeklyReviewQueue component
- [ ] Create ClientReviewPanel component
- [ ] Build CoachNotesTimeline component
- [ ] Create QuickNoteWidget component
- [ ] Implement keyboard shortcuts for review workflow

### Cohort Custom Check-ins (Part of Phase 5)
- [ ] Create CohortCheckInConfig model
- [ ] Build config API routes
- [ ] Create CheckInConfigEditor component
- [ ] Update DailyCheckInForm to show custom questions
- [ ] Store custom responses in Entry.customResponses

---

## Testing Scenarios

### Daily Check-In Flow
1. Client opens app on Monday morning
2. HealthKit has already synced overnight (steps, sleep, workouts)
3. Client clicks "Daily Check-In"
4. Form shows:
   - Weight: [empty] (manual input)
   - Steps: 8,432 ✓ (from HealthKit, grayed out)
   - Calories: 2,150 ✓ (from HealthKit, grayed out)
   - Sleep Quality: [1-10 scale] (manual input, but pre-filled from HealthKit sleep score)
   - Perceived Stress: [1-10 scale] (manual input)
   - Custom question from cohort: "Did you drink 8 glasses of water?" [Yes/No]
5. Client fills in weight, stress, water question
6. Clicks "Save"
7. Entry saved with dataSources properly tracked

### Weekly Questionnaire Flow
1. Monday morning, client logs in
2. Banner: "Week 3 questionnaire is now available!"
3. Client clicks banner → Opens questionnaire form
4. SurveyJS renders questions from QuestionnaireBundle
5. Client answers questions (partially)
6. Auto-save as IN_PROGRESS
7. Client leaves, comes back later
8. Form resumes where they left off
9. Client completes and submits
10. Status changes to COMPLETED
11. Coach receives notification

### Coach Review Flow
1. Coach logs in Monday morning
2. Dashboard shows: "15 clients to review this week"
3. Clicks "Start Reviews" → Opens WeeklyReviewQueue
4. Table shows 15 clients sorted by attention score (lowest first)
5. Top client has score of 32 (red badge) - needs attention!
6. Coach clicks "Start Review" → Opens ClientReviewPanel
7. Left panel shows:
   - Check-ins: 2/7 ⚠
   - Questionnaire: Not completed ✗
   - Attention score breakdown: Check-in consistency low (10/30), Questionnaire missing (0/25)
   - Last week's notes visible
8. Coach reads through available check-in data
9. Coach adds note: "Missing check-ins and questionnaire. Will reach out today."
10. Tags note: "follow-up", "engagement"
11. Coach clicks "Mark as Reviewed"
12. Panel automatically shows next client (score 45)
13. Process repeats

### Attention Score Calculation Test
1. Cron job runs Monday 12am
2. For Client A:
   - Check-ins last week: 7/7 → 30 points
   - Questionnaire: Completed on time → 25 points
   - Sentiment: No negative indicators → 20 points
   - Engagement: Same as last week → 10 points
   - Goals: Achieved 3/4 → 7.5 points
   - **Total: 92.5 → Green (doing great!)**
3. For Client B:
   - Check-ins last week: 2/7 → 10 points
   - Questionnaire: Not completed → 0 points
   - Sentiment: "Struggling with motivation" → -5 points, Stress = 9 → -10 points → 5 points
   - Engagement: Down from 5 last week → 0 points
   - Goals: None tracked → 5 points
   - **Total: 20 → Red (needs attention!)**
4. Scores saved to AttentionScore table
5. Recommended actions generated
6. Review queue populated at 1am with Client B at top (priority 9/10)

---

## Performance Considerations

1. **Database Indexing**:
   - Index on `[userId, date]` for Entry lookups
   - Index on `[userId, startTime]` for HealthKit queries
   - Index on `[coachId, status, priority]` for review queue sorting

2. **Caching**:
   - Cache attention scores for 24 hours (they're recalculated weekly)
   - Cache cohort configs (rarely change)
   - Cache questionnaire bundles per week

3. **Pagination**:
   - Paginate check-in history (20 per page)
   - Paginate review queue if > 100 clients
   - Lazy load HealthKit data (load on demand)

4. **API Rate Limiting**:
   - HealthKit sync endpoint: 100 requests/hour per user
   - Prevent abuse of pairing code generation (1 per hour)

5. **Background Jobs**:
   - Attention score calculation: Run in batches of 50 users to avoid timeouts
   - Review queue population: Process cohorts in parallel
   - Email sending: Queue system (not synchronous API calls)

---

## Security Considerations

1. **HealthKit Data**:
   - Pairing codes expire after 24 hours
   - Verify user identity before accepting data
   - Only coaches assigned to user's cohorts can view HealthKit data

2. **Coach Notes**:
   - Private notes only visible to note author
   - Shared notes visible to client and all assigned coaches
   - Audit log for note access (who viewed when)

3. **Review Queue**:
   - Coaches can only see clients in cohorts they're assigned to
   - No cross-cohort data leakage
   - Review status changes logged for accountability

4. **Questionnaire Responses**:
   - Responses only visible to assigned coaches and admins
   - No public access to any response data
   - Anonymized aggregates for reporting

---

## Future Enhancements

1. **AI-Powered Insights**:
   - Use LLM to analyze questionnaire text responses
   - Auto-generate personalized coaching recommendations
   - Detect patterns across cohorts

2. **Video Check-ins**:
   - Allow clients to record short video updates
   - Store in cloud storage (S3/Cloudflare R2)
   - Coach can watch and add notes

3. **Peer Support**:
   - Cohort member directory
   - Group chat per cohort
   - Accountability buddy matching

4. **Nutrition Tracking**:
   - Integration with MyFitnessPal API
   - Photo-based meal logging
   - Macro tracking and goals

5. **Habit Tracking**:
   - Daily habit checkboxes (separate from check-ins)
   - Streak tracking
   - Habit analytics

6. **Mobile App**:
   - Native iOS/Android apps
   - Push notifications for check-in reminders
   - Offline mode for check-ins

---

## Conclusion

This specification covers ALL CoachFit functionality integrated into the unified platform:

✅ **Daily Fitness Data Recording** - Entry model with flexible custom responses
✅ **iOS HealthKit Integration** - Workout and sleep data sync with pairing codes
✅ **Weekly Questionnaire System** - SurveyJS-powered flexible questionnaires
✅ **Weekly Questionnaire Reporting** - Coach dashboard with analytics
✅ **Attention Scoring** - Automated prioritization algorithm
✅ **Coach Notes** - Comprehensive note-taking system
✅ **Weekly Review Queue** - Automated workflow for coach reviews
✅ **Multi-week Programs** - Cohort system with custom check-in configs

The implementation is production-ready, scalable, and follows best practices for Next.js 15, PostgreSQL, and TypeScript development.

**Ready to build!** 🚀
