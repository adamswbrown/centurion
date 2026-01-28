/**
 * Workouts Server Actions Tests
 *
 * Tests for workout-related server actions including
 * creation, updating, deletion, and retrieval.
 */

import { describe, it, expect, beforeEach, vi } from "vitest"
import { WorkoutStatus } from "@prisma/client"

// Import mocks BEFORE importing the functions being tested
import { mockPrisma } from "../mocks/prisma"
import {
  setupAuthMock,
  mockAdminUser,
  mockCoachUser,
  mockClientUser,
} from "../mocks/auth"

// Mock next/cache and next/navigation
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}))

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}))

// Now import the functions to test (after mocks are set up)
import {
  getWorkouts,
  getWorkoutById,
  createWorkout,
  updateWorkout,
  deleteWorkout,
} from "@/app/actions/workouts"

describe("Workouts Server Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("getWorkouts", () => {
    it("should return workouts with default limit of 50", async () => {
      setupAuthMock(mockCoachUser)

      const mockWorkouts = [
        {
          id: 1,
          userId: 3,
          coachId: 2,
          title: "Morning Workout",
          description: "Cardio session",
          videoUrl: null,
          status: WorkoutStatus.NOT_STARTED,
          scheduledAt: new Date("2024-02-01T09:00:00"),
          completedAt: null,
          duration: 60,
          createdAt: new Date(),
          updatedAt: new Date(),
          user: { id: 3, name: "Client User", email: "client@test.com" },
        },
      ]

      mockPrisma.workout.findMany.mockResolvedValue(mockWorkouts)

      const result = await getWorkouts()

      expect(result).toHaveLength(1)
      expect(mockPrisma.workout.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 50,
        })
      )
    })

    it("should allow client to see only their own workouts", async () => {
      setupAuthMock(mockClientUser)

      const mockWorkouts = [
        {
          id: 1,
          userId: 3,
          coachId: 2,
          title: "My Workout",
          description: null,
          videoUrl: null,
          status: WorkoutStatus.NOT_STARTED,
          scheduledAt: null,
          completedAt: null,
          duration: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          user: { id: 3, name: "Client User", email: "client@test.com" },
        },
      ]

      mockPrisma.workout.findMany.mockResolvedValue(mockWorkouts)

      await getWorkouts()

      expect(mockPrisma.workout.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 3,
          }),
        })
      )
    })

    it("should allow coach to filter by userId", async () => {
      setupAuthMock(mockCoachUser)

      mockPrisma.workout.findMany.mockResolvedValue([])

      await getWorkouts({ userId: 5 })

      expect(mockPrisma.workout.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 5,
          }),
        })
      )
    })

    it("should allow coach to filter by coachId and status", async () => {
      setupAuthMock(mockCoachUser)

      mockPrisma.workout.findMany.mockResolvedValue([])

      await getWorkouts({ coachId: 2, status: WorkoutStatus.COMPLETED })

      expect(mockPrisma.workout.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            coachId: 2,
            status: WorkoutStatus.COMPLETED,
          }),
        })
      )
    })

    it("should throw error when unauthenticated", async () => {
      setupAuthMock(null)

      await expect(getWorkouts()).rejects.toThrow("Unauthorized")
    })
  })

  describe("getWorkoutById", () => {
    it("should return workout by id for coach", async () => {
      setupAuthMock(mockCoachUser)

      const mockWorkout = {
        id: 1,
        userId: 3,
        coachId: 2,
        title: "Test Workout",
        description: "Description",
        videoUrl: null,
        status: WorkoutStatus.NOT_STARTED,
        scheduledAt: new Date("2024-02-01T09:00:00"),
        completedAt: null,
        duration: 60,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: { id: 3, name: "Client User", email: "client@test.com" },
      }

      mockPrisma.workout.findUnique.mockResolvedValue(mockWorkout)

      const result = await getWorkoutById(1)

      expect(result.id).toBe(1)
      expect(result.title).toBe("Test Workout")
    })

    it("should allow client to view their own workout", async () => {
      setupAuthMock(mockClientUser)

      const mockWorkout = {
        id: 1,
        userId: 3,
        coachId: 2,
        title: "My Workout",
        description: null,
        videoUrl: null,
        status: WorkoutStatus.NOT_STARTED,
        scheduledAt: null,
        completedAt: null,
        duration: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: { id: 3, name: "Client User", email: "client@test.com" },
      }

      mockPrisma.workout.findUnique.mockResolvedValue(mockWorkout)

      const result = await getWorkoutById(1)

      expect(result.id).toBe(1)
    })

    it("should forbid client from viewing others' workouts", async () => {
      setupAuthMock(mockClientUser)

      const mockWorkout = {
        id: 1,
        userId: 999, // Different user
        coachId: 2,
        title: "Another's Workout",
        description: null,
        videoUrl: null,
        status: WorkoutStatus.NOT_STARTED,
        scheduledAt: null,
        completedAt: null,
        duration: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: { id: 999, name: "Other User", email: "other@test.com" },
      }

      mockPrisma.workout.findUnique.mockResolvedValue(mockWorkout)

      await expect(getWorkoutById(1)).rejects.toThrow("Forbidden")
    })

    it("should throw error when workout not found", async () => {
      setupAuthMock(mockCoachUser)

      mockPrisma.workout.findUnique.mockResolvedValue(null)

      await expect(getWorkoutById(999)).rejects.toThrow("Workout not found")
    })

    it("should throw error when unauthenticated", async () => {
      setupAuthMock(null)

      await expect(getWorkoutById(1)).rejects.toThrow("Unauthorized")
    })
  })

  describe("createWorkout", () => {
    it("should create workout successfully as coach", async () => {
      setupAuthMock(mockCoachUser)

      const mockWorkout = {
        id: 1,
        userId: 3,
        coachId: 2,
        title: "New Workout",
        description: "Test description",
        videoUrl: "https://example.com/video",
        status: WorkoutStatus.NOT_STARTED,
        scheduledAt: new Date("2024-02-01T09:00:00"),
        completedAt: null,
        duration: 45,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: { id: 3, name: "Client User", email: "client@test.com" },
      }

      mockPrisma.workout.create.mockResolvedValue(mockWorkout)

      const result = await createWorkout({
        userId: 3,
        title: "New Workout",
        description: "Test description",
        videoUrl: "https://example.com/video",
        scheduledAt: "2024-02-01T09:00:00",
        duration: 45,
      })

      expect(result.id).toBe(1)
      expect(mockPrisma.workout.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 3,
            coachId: 2,
            title: "New Workout",
          }),
        })
      )
    })

    it("should set coachId from session", async () => {
      setupAuthMock(mockCoachUser)

      const mockWorkout = {
        id: 1,
        userId: 3,
        coachId: 2,
        title: "New Workout",
        description: null,
        videoUrl: null,
        status: WorkoutStatus.NOT_STARTED,
        scheduledAt: null,
        completedAt: null,
        duration: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: { id: 3, name: "Client User", email: "client@test.com" },
      }

      mockPrisma.workout.create.mockResolvedValue(mockWorkout)

      await createWorkout({
        userId: 3,
        title: "New Workout",
      })

      expect(mockPrisma.workout.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            coachId: 2,
          }),
        })
      )
    })

    it("should validate required fields", async () => {
      setupAuthMock(mockCoachUser)

      await expect(
        createWorkout({
          userId: 0, // Invalid
          title: "",
        })
      ).rejects.toThrow()
    })

    it("should require coach role", async () => {
      setupAuthMock(mockClientUser)

      await expect(
        createWorkout({
          userId: 3,
          title: "New Workout",
        })
      ).rejects.toThrow("Forbidden")
    })
  })

  describe("updateWorkout", () => {
    it("should allow coach to update all fields", async () => {
      setupAuthMock(mockCoachUser)

      const existingWorkout = {
        id: 1,
        userId: 3,
        coachId: 2,
        title: "Old Title",
        description: "Old description",
        videoUrl: null,
        status: WorkoutStatus.NOT_STARTED,
        scheduledAt: null,
        completedAt: null,
        duration: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const updatedWorkout = {
        ...existingWorkout,
        title: "New Title",
        description: "New description",
        videoUrl: "https://example.com/video",
        duration: 60,
        user: { id: 3, name: "Client User", email: "client@test.com" },
      }

      mockPrisma.workout.findUnique.mockResolvedValue(existingWorkout)
      mockPrisma.workout.update.mockResolvedValue(updatedWorkout)

      const result = await updateWorkout({
        id: 1,
        title: "New Title",
        description: "New description",
        videoUrl: "https://example.com/video",
        duration: 60,
      })

      expect(result.title).toBe("New Title")
      expect(mockPrisma.workout.update).toHaveBeenCalled()
    })

    it("should allow client to update status only", async () => {
      setupAuthMock(mockClientUser)

      const existingWorkout = {
        id: 1,
        userId: 3,
        coachId: 2,
        title: "Workout",
        description: null,
        videoUrl: null,
        status: WorkoutStatus.NOT_STARTED,
        scheduledAt: null,
        completedAt: null,
        duration: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const updatedWorkout = {
        ...existingWorkout,
        status: WorkoutStatus.IN_PROGRESS,
      }

      mockPrisma.workout.findUnique.mockResolvedValue(existingWorkout)
      mockPrisma.workout.update.mockResolvedValue(updatedWorkout)

      const result = await updateWorkout({
        id: 1,
        status: WorkoutStatus.IN_PROGRESS,
      })

      expect(mockPrisma.workout.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: WorkoutStatus.IN_PROGRESS,
          }),
        })
      )
    })

    it("should forbid client from updating others' workouts", async () => {
      setupAuthMock(mockClientUser)

      const existingWorkout = {
        id: 1,
        userId: 999, // Different user
        coachId: 2,
        title: "Workout",
        description: null,
        videoUrl: null,
        status: WorkoutStatus.NOT_STARTED,
        scheduledAt: null,
        completedAt: null,
        duration: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockPrisma.workout.findUnique.mockResolvedValue(existingWorkout)

      await expect(
        updateWorkout({
          id: 1,
          status: WorkoutStatus.IN_PROGRESS,
        })
      ).rejects.toThrow("Forbidden")
    })

    it("should auto-set completedAt when status is COMPLETED", async () => {
      setupAuthMock(mockClientUser)

      const existingWorkout = {
        id: 1,
        userId: 3,
        coachId: 2,
        title: "Workout",
        description: null,
        videoUrl: null,
        status: WorkoutStatus.IN_PROGRESS,
        scheduledAt: null,
        completedAt: null,
        duration: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const updatedWorkout = {
        ...existingWorkout,
        status: WorkoutStatus.COMPLETED,
        completedAt: new Date(),
      }

      mockPrisma.workout.findUnique.mockResolvedValue(existingWorkout)
      mockPrisma.workout.update.mockResolvedValue(updatedWorkout)

      await updateWorkout({
        id: 1,
        status: WorkoutStatus.COMPLETED,
      })

      expect(mockPrisma.workout.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: WorkoutStatus.COMPLETED,
            completedAt: expect.any(Date),
          }),
        })
      )
    })

    it("should validate input fields", async () => {
      setupAuthMock(mockCoachUser)

      await expect(
        updateWorkout({
          id: 0, // Invalid
          title: "Test",
        })
      ).rejects.toThrow()
    })

    it("should throw error when workout not found", async () => {
      setupAuthMock(mockCoachUser)

      mockPrisma.workout.findUnique.mockResolvedValue(null)

      await expect(
        updateWorkout({
          id: 999,
          title: "Test",
        })
      ).rejects.toThrow("Workout not found")
    })

    it("should throw error when unauthenticated", async () => {
      setupAuthMock(null)

      await expect(
        updateWorkout({
          id: 1,
          title: "Test",
        })
      ).rejects.toThrow("Unauthorized")
    })
  })

  describe("deleteWorkout", () => {
    it("should delete workout successfully as coach", async () => {
      setupAuthMock(mockCoachUser)

      const existingWorkout = {
        id: 1,
        userId: 3,
        coachId: 2,
        title: "Workout to delete",
        description: null,
        videoUrl: null,
        status: WorkoutStatus.NOT_STARTED,
        scheduledAt: null,
        completedAt: null,
        duration: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockPrisma.workout.findUnique.mockResolvedValue(existingWorkout)
      mockPrisma.workout.delete.mockResolvedValue(existingWorkout)

      const result = await deleteWorkout(1)

      expect(result.success).toBe(true)
      expect(mockPrisma.workout.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      })
    })

    it("should throw error when workout not found", async () => {
      setupAuthMock(mockCoachUser)

      mockPrisma.workout.findUnique.mockResolvedValue(null)

      await expect(deleteWorkout(999)).rejects.toThrow("Workout not found")
    })

    it("should require coach role", async () => {
      setupAuthMock(mockClientUser)

      await expect(deleteWorkout(1)).rejects.toThrow("Forbidden")
    })
  })
})
