/**
 * Test Data Factories
 *
 * Provides factory functions to create test data for various models.
 * These factories create realistic data that matches the Prisma schema.
 */

import { Prisma, AttendanceStatus, PaymentStatus, CohortStatus, MembershipStatus, Role } from "@prisma/client"

// ============================================
// USER FACTORIES
// ============================================

let userIdCounter = 1

export interface CreateUserOptions {
  id?: number
  email?: string
  name?: string | null
  role?: Role
  password?: string | null
  image?: string | null
  credits?: number
  isTestUser?: boolean
}

export function createMockUser(options: CreateUserOptions = {}) {
  const id = options.id ?? userIdCounter++
  return {
    id,
    email: options.email ?? `user${id}@test.com`,
    name: options.name ?? `User ${id}`,
    password: options.password ?? null,
    image: options.image ?? null,
    role: options.role ?? ("CLIENT" as Role),
    credits: options.credits ?? 0,
    creditsExpiry: null,
    isTestUser: options.isTestUser ?? true,
    emailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

export function createMockAdmin(options: Partial<CreateUserOptions> = {}) {
  return createMockUser({ ...options, role: "ADMIN" })
}

export function createMockCoach(options: Partial<CreateUserOptions> = {}) {
  return createMockUser({ ...options, role: "COACH" })
}

export function createMockClient(options: Partial<CreateUserOptions> = {}) {
  return createMockUser({ ...options, role: "CLIENT" })
}

// ============================================
// APPOINTMENT FACTORIES
// ============================================

let appointmentIdCounter = 1

export interface CreateAppointmentOptions {
  id?: number
  userId?: number
  startTime?: Date
  endTime?: Date
  fee?: number | Prisma.Decimal
  status?: AttendanceStatus
  notes?: string | null
  googleEventId?: string | null
  invoiceId?: number | null
}

export function createMockAppointment(options: CreateAppointmentOptions = {}) {
  const id = options.id ?? appointmentIdCounter++
  const startTime = options.startTime ?? new Date()
  const endTime = options.endTime ?? new Date(startTime.getTime() + 60 * 60 * 1000) // 1 hour later

  return {
    id,
    userId: options.userId ?? 1,
    startTime,
    endTime,
    fee: options.fee instanceof Prisma.Decimal ? options.fee : new Prisma.Decimal(options.fee ?? 50),
    status: options.status ?? AttendanceStatus.NOT_ATTENDED,
    notes: options.notes ?? null,
    googleEventId: options.googleEventId ?? null,
    invoiceId: options.invoiceId ?? null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

// ============================================
// INVOICE FACTORIES
// ============================================

let invoiceIdCounter = 1

export interface CreateInvoiceOptions {
  id?: number
  userId?: number
  month?: Date
  totalAmount?: number | Prisma.Decimal
  paymentStatus?: PaymentStatus
  stripePaymentUrl?: string | null
  paidAt?: Date | null
}

export function createMockInvoice(options: CreateInvoiceOptions = {}) {
  const id = options.id ?? invoiceIdCounter++

  return {
    id,
    userId: options.userId ?? 1,
    month: options.month ?? new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    totalAmount:
      options.totalAmount instanceof Prisma.Decimal
        ? options.totalAmount
        : new Prisma.Decimal(options.totalAmount ?? 200),
    emailSent: false,
    emailSentAt: null,
    paymentStatus: options.paymentStatus ?? PaymentStatus.UNPAID,
    stripePaymentUrl: options.stripePaymentUrl ?? null,
    paidAt: options.paidAt ?? null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

// ============================================
// COHORT FACTORIES
// ============================================

let cohortIdCounter = 1

export interface CreateCohortOptions {
  id?: number
  name?: string
  description?: string | null
  startDate?: Date
  endDate?: Date | null
  status?: CohortStatus
}

export function createMockCohort(options: CreateCohortOptions = {}) {
  const id = options.id ?? cohortIdCounter++

  return {
    id,
    name: options.name ?? `Cohort ${id}`,
    description: options.description ?? null,
    startDate: options.startDate ?? new Date(),
    endDate: options.endDate ?? new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days later
    status: options.status ?? CohortStatus.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

// ============================================
// COHORT MEMBERSHIP FACTORIES
// ============================================

let membershipIdCounter = 1

export interface CreateCohortMembershipOptions {
  id?: number
  cohortId?: number
  userId?: number
  status?: MembershipStatus
  joinedAt?: Date
  leftAt?: Date | null
}

export function createMockCohortMembership(options: CreateCohortMembershipOptions = {}) {
  const id = options.id ?? membershipIdCounter++

  return {
    id,
    cohortId: options.cohortId ?? 1,
    userId: options.userId ?? 1,
    status: options.status ?? MembershipStatus.ACTIVE,
    joinedAt: options.joinedAt ?? new Date(),
    leftAt: options.leftAt ?? null,
  }
}

// ============================================
// COACH COHORT MEMBERSHIP FACTORIES
// ============================================

let coachMembershipIdCounter = 1

export interface CreateCoachCohortMembershipOptions {
  id?: number
  cohortId?: number
  coachId?: number
}

export function createMockCoachCohortMembership(options: CreateCoachCohortMembershipOptions = {}) {
  const id = options.id ?? coachMembershipIdCounter++

  return {
    id,
    cohortId: options.cohortId ?? 1,
    coachId: options.coachId ?? 1,
    createdAt: new Date(),
  }
}

// ============================================
// ENTRY FACTORIES
// ============================================

let entryIdCounter = 1

export interface CreateEntryOptions {
  id?: number
  userId?: number
  date?: Date
  weight?: number | null
  steps?: number | null
  calories?: number | null
  sleepQuality?: number | null
  perceivedStress?: number | null
  notes?: string | null
}

export function createMockEntry(options: CreateEntryOptions = {}) {
  const id = options.id ?? entryIdCounter++

  return {
    id,
    userId: options.userId ?? 1,
    date: options.date ?? new Date(),
    weight: options.weight ?? null,
    steps: options.steps ?? null,
    calories: options.calories ?? null,
    sleepQuality: options.sleepQuality ?? null,
    perceivedStress: options.perceivedStress ?? null,
    notes: options.notes ?? null,
    customResponses: null,
    dataSources: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

// ============================================
// WEEKLY COACH RESPONSE FACTORIES
// ============================================

let weeklyResponseIdCounter = 1

export interface CreateWeeklyCoachResponseOptions {
  id?: number
  coachId?: number
  clientId?: number
  weekStart?: Date
  loomUrl?: string | null
  note?: string | null
}

export function createMockWeeklyCoachResponse(options: CreateWeeklyCoachResponseOptions = {}) {
  const id = options.id ?? weeklyResponseIdCounter++

  return {
    id,
    coachId: options.coachId ?? 1,
    clientId: options.clientId ?? 2,
    weekStart: options.weekStart ?? new Date(),
    loomUrl: options.loomUrl ?? null,
    note: options.note ?? null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

// ============================================
// RESET COUNTERS (for test isolation)
// ============================================

export function resetIdCounters() {
  userIdCounter = 1
  appointmentIdCounter = 1
  invoiceIdCounter = 1
  cohortIdCounter = 1
  membershipIdCounter = 1
  coachMembershipIdCounter = 1
  entryIdCounter = 1
  weeklyResponseIdCounter = 1
}
