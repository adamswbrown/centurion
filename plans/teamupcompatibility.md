# TeamUp Compatibility Plan

## Purpose
This document outlines the requirements, schema changes, and downstream impacts for making the Centurion platform's test data and codebase compatible with TeamUp data exports (instructors and appointments/events).

---

## 1. Data Source Compatibility
- **instructors.json**: Contains all coaches to be seeded as users with role=COACH.
- **appointments.json**: Contains all events/appointments, each referencing one or more instructors by name.
- Both files are generated from TeamUp's paginated API and are guaranteed to be in sync.

---

## 2. Prisma Schema Changes
To support linking coaches to appointments:

- Add a `coachId` field to the `Appointment` model:

```prisma
model Appointment {
  id            Int      @id @default(autoincrement())
  userId        Int
  coachId       Int      // <-- Added
  startTime     DateTime
  endTime       DateTime
  fee           Decimal  @db.Decimal(10, 2)
  status        AttendanceStatus @default(NOT_ATTENDED)
  notes         String?
  googleEventId String?
  invoiceId     Int?

  user    User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  coach   User     @relation(fields: [coachId], references: [id], onDelete: Cascade) // <-- Added
  invoice Invoice? @relation(fields: [invoiceId], references: [id])

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("appointments")
  @@index([userId])
  @@index([coachId]) // <-- Added
  @@index([startTime])
  @@index([userId, startTime])
  @@index([invoiceId])
  @@index([status])
}
```

- Run:
  - `npx prisma migrate dev --name add-coach-to-appointment`
  - `npx prisma generate`

---

## 3. Seed Script Changes
- Seed all coaches from `instructors.json`.
- Seed all appointments from `appointments.json`, mapping the first instructor to a seeded coach user by name.
- Set `coachId` on each appointment.
- Assign clients randomly for synthetic data.

---

## 4. Downstream/Codebase Impacts
- **UI:**
  - Appointment detail and list pages can now display coach info (name, avatar, etc.).
  - Appointment forms should allow selecting a coach (dropdown, autocomplete).
- **API:**
  - Endpoints should accept/return `coachId` and optionally coach details.
  - Update DTOs, serializers, and validation schemas as needed.
- **Queries:**
  - Use `include: { coach: true }` in Prisma queries to fetch coach details.
- **Tests:**
  - Update tests to expect and validate `coachId` on appointments.

---

## 5. Summary
- The Centurion codebase and TeamUp data are compatible with these changes.
- All future test data can be generated from TeamUp exports with minimal manual intervention.
- UI and API can be enhanced to leverage coach-appointment relationships for richer features.
