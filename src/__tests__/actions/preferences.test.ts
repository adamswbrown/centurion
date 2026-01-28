import { describe, it, expect, vi, beforeEach } from "vitest"
import { mockPrisma } from "../mocks/prisma"
import {
  setupAuthMock,
  mockAdminUser,
  mockCoachUser,
  mockClientUser,
} from "../mocks/auth"

vi.mock("@/lib/prisma")
vi.mock("@/auth")
vi.mock("@/lib/auth")
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("next/navigation", () => ({ redirect: vi.fn() }))

const DEFAULT_PREFERENCES = {
  weightUnit: "lbs",
  measurementUnit: "inches",
  dateFormat: "MM/dd/yyyy",
}

const mockPreferencesData = {
  id: 1,
  userId: mockClientUser.id,
  weightUnit: "kg",
  measurementUnit: "cm",
  dateFormat: "dd/MM/yyyy",
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe("Preferences Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("getUserPreferences", () => {
    it("returns stored preferences for current user", async () => {
      setupAuthMock(mockClientUser)
      mockPrisma.userPreference.findUnique.mockResolvedValue(
        mockPreferencesData
      )

      const { getUserPreferences } = await import(
        "@/app/actions/preferences"
      )
      const result = await getUserPreferences()

      expect(mockPrisma.userPreference.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: Number.parseInt(mockClientUser.id, 10) },
        })
      )
      expect(result).toEqual(mockPreferencesData)
    })

    it("returns defaults when no preferences exist with id=0", async () => {
      setupAuthMock(mockClientUser)
      mockPrisma.userPreference.findUnique.mockResolvedValue(null)

      const { getUserPreferences } = await import(
        "@/app/actions/preferences"
      )
      const result = await getUserPreferences()

      expect(result).toMatchObject({
        id: 0,
        weightUnit: DEFAULT_PREFERENCES.weightUnit,
        measurementUnit: DEFAULT_PREFERENCES.measurementUnit,
        dateFormat: DEFAULT_PREFERENCES.dateFormat,
      })
    })

    it("returns default weightUnit as lbs", async () => {
      setupAuthMock(mockClientUser)
      mockPrisma.userPreference.findUnique.mockResolvedValue(null)

      const { getUserPreferences } = await import(
        "@/app/actions/preferences"
      )
      const result = await getUserPreferences()

      expect(result.weightUnit).toBe("lbs")
    })

    it("returns default measurementUnit as inches", async () => {
      setupAuthMock(mockClientUser)
      mockPrisma.userPreference.findUnique.mockResolvedValue(null)

      const { getUserPreferences } = await import(
        "@/app/actions/preferences"
      )
      const result = await getUserPreferences()

      expect(result.measurementUnit).toBe("inches")
    })

    it("returns default dateFormat as MM/dd/yyyy", async () => {
      setupAuthMock(mockClientUser)
      mockPrisma.userPreference.findUnique.mockResolvedValue(null)

      const { getUserPreferences } = await import(
        "@/app/actions/preferences"
      )
      const result = await getUserPreferences()

      expect(result.dateFormat).toBe("MM/dd/yyyy")
    })

    it("allows coach to view other user's preferences", async () => {
      setupAuthMock(mockCoachUser)
      const clientId = Number.parseInt(mockClientUser.id, 10)
      const otherUserPrefs = {
        ...mockPreferencesData,
        userId: clientId,
      }
      mockPrisma.userPreference.findUnique.mockResolvedValue(otherUserPrefs)

      const { getUserPreferences } = await import(
        "@/app/actions/preferences"
      )
      const result = await getUserPreferences(clientId)

      expect(mockPrisma.userPreference.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: clientId },
        })
      )
      expect(result).toEqual(otherUserPrefs)
    })

    it("allows admin to view other user's preferences", async () => {
      setupAuthMock(mockAdminUser)
      mockPrisma.userPreference.findUnique.mockResolvedValue(
        mockPreferencesData
      )

      const { getUserPreferences } = await import(
        "@/app/actions/preferences"
      )
      const result = await getUserPreferences(Number.parseInt(mockClientUser.id, 10))

      expect(result).toEqual(mockPreferencesData)
    })

    it("prevents client from viewing other user's preferences", async () => {
      setupAuthMock(mockClientUser)

      const { getUserPreferences } = await import(
        "@/app/actions/preferences"
      )

      await expect(getUserPreferences(999)).rejects.toThrow()
    })

    it("rejects unauthenticated user", async () => {
      setupAuthMock(null)

      const { getUserPreferences } = await import(
        "@/app/actions/preferences"
      )

      await expect(getUserPreferences()).rejects.toThrow()
    })
  })

  describe("updateUserPreferences", () => {
    it("updates all preference fields", async () => {
      setupAuthMock(mockClientUser)
      const input = {
        weightUnit: "kg",
        measurementUnit: "cm",
        dateFormat: "dd/MM/yyyy",
      }
      mockPrisma.userPreference.upsert.mockResolvedValue({
        id: 1,
        userId: mockClientUser.id,
        ...input,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const { updateUserPreferences } = await import(
        "@/app/actions/preferences"
      )
      const result = await updateUserPreferences(input)

      const userId = Number.parseInt(mockClientUser.id, 10)
      expect(mockPrisma.userPreference.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId },
        })
      )
      expect(result).toMatchObject({ success: true })
    })

    it("updates a single field", async () => {
      setupAuthMock(mockClientUser)
      const input = {
        weightUnit: "kg",
      }
      mockPrisma.userPreference.upsert.mockResolvedValue({
        id: 1,
        userId: mockClientUser.id,
        weightUnit: "kg",
        measurementUnit: "inches",
        dateFormat: "MM/dd/yyyy",
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const { updateUserPreferences } = await import(
        "@/app/actions/preferences"
      )
      const result = await updateUserPreferences(input)

      expect(mockPrisma.userPreference.upsert).toHaveBeenCalled()
      expect(result).toMatchObject({ success: true })
    })

    it("creates preferences when none exist (upsert)", async () => {
      setupAuthMock(mockClientUser)
      const input = {
        weightUnit: "kg",
        measurementUnit: "cm",
        dateFormat: "yyyy-MM-dd",
      }
      mockPrisma.userPreference.upsert.mockResolvedValue({
        id: 2,
        userId: mockClientUser.id,
        ...input,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const { updateUserPreferences } = await import(
        "@/app/actions/preferences"
      )
      const result = await updateUserPreferences(input)

      const userId = Number.parseInt(mockClientUser.id, 10)
      expect(mockPrisma.userPreference.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId },
          create: expect.objectContaining({
            userId,
          }),
        })
      )
      expect(result).toMatchObject({ success: true })
    })

    it("returns error on invalid weightUnit", async () => {
      setupAuthMock(mockClientUser)

      const { updateUserPreferences } = await import(
        "@/app/actions/preferences"
      )
      const result = await updateUserPreferences({
        weightUnit: "stones" as string,
      })

      expect(result).toHaveProperty("error")
      expect(mockPrisma.userPreference.upsert).not.toHaveBeenCalled()
    })

    it("returns error on invalid dateFormat", async () => {
      setupAuthMock(mockClientUser)

      const { updateUserPreferences } = await import(
        "@/app/actions/preferences"
      )
      const result = await updateUserPreferences({
        dateFormat: "INVALID_FORMAT" as string,
      })

      expect(result).toHaveProperty("error")
      expect(mockPrisma.userPreference.upsert).not.toHaveBeenCalled()
    })

    it("returns error on invalid measurementUnit", async () => {
      setupAuthMock(mockClientUser)

      const { updateUserPreferences } = await import(
        "@/app/actions/preferences"
      )
      const result = await updateUserPreferences({
        measurementUnit: "furlongs" as string,
      })

      expect(result).toHaveProperty("error")
      expect(mockPrisma.userPreference.upsert).not.toHaveBeenCalled()
    })

    it("rejects unauthenticated user", async () => {
      setupAuthMock(null)

      const { updateUserPreferences } = await import(
        "@/app/actions/preferences"
      )

      await expect(
        updateUserPreferences({ weightUnit: "kg" })
      ).rejects.toThrow()
    })
  })
})
