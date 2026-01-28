import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ReactNode } from "react"

vi.mock("@/app/actions/class-types", () => ({
  getClassTypes: vi.fn(),
  getClassTypeById: vi.fn(),
  createClassType: vi.fn(),
  updateClassType: vi.fn(),
  deleteClassType: vi.fn(),
}))

import {
  getClassTypes,
  getClassTypeById,
  createClassType,
  updateClassType,
  deleteClassType,
} from "@/app/actions/class-types"
import {
  useClassTypes,
  useClassType,
  useCreateClassType,
  useUpdateClassType,
  useDeleteClassType,
} from "@/hooks/useClassTypes"

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  })
}

function createWrapper() {
  const queryClient = createTestQueryClient()
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    )
  }
}

describe("useClassTypes", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("useClassTypes", () => {
    it("should fetch all class types", async () => {
      const mockClassTypes = [
        { id: "1", name: "Strength", active: true },
        { id: "2", name: "Cardio", active: true },
      ]
      vi.mocked(getClassTypes).mockResolvedValue(mockClassTypes)

      const { result } = renderHook(() => useClassTypes(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(mockClassTypes)
      expect(getClassTypes).toHaveBeenCalledWith(undefined)
    })

    it("should fetch only active class types when activeOnly is true", async () => {
      const mockClassTypes = [
        { id: "1", name: "Strength", active: true },
      ]
      vi.mocked(getClassTypes).mockResolvedValue(mockClassTypes)

      const { result } = renderHook(
        () => useClassTypes({ activeOnly: true }),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(mockClassTypes)
      expect(getClassTypes).toHaveBeenCalledWith({ activeOnly: true })
    })

    it("should handle fetch error", async () => {
      const error = new Error("Failed to fetch class types")
      vi.mocked(getClassTypes).mockRejectedValue(error)

      const { result } = renderHook(() => useClassTypes(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toBe(error)
    })
  })

  describe("useClassType", () => {
    it("should fetch class type by id", async () => {
      const mockClassType = { id: "1", name: "Strength", active: true }
      vi.mocked(getClassTypeById).mockResolvedValue(mockClassType)

      const { result } = renderHook(() => useClassType(1), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(mockClassType)
      expect(getClassTypeById).toHaveBeenCalledWith(1)
    })

    it("should be disabled when id is 0", async () => {
      const { result } = renderHook(() => useClassType(0), {
        wrapper: createWrapper(),
      })

      expect(result.current.fetchStatus).toBe("idle")
      expect(getClassTypeById).not.toHaveBeenCalled()
    })

    it("should handle fetch error", async () => {
      const error = new Error("Class type not found")
      vi.mocked(getClassTypeById).mockRejectedValue(error)

      const { result } = renderHook(() => useClassType("999"), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toBe(error)
    })
  })

  describe("useCreateClassType", () => {
    it("should create class type", async () => {
      const newClassType = { id: "3", name: "Flexibility", active: true }
      vi.mocked(createClassType).mockResolvedValue(newClassType)

      const { result } = renderHook(() => useCreateClassType(), {
        wrapper: createWrapper(),
      })

      const { mutate } = result.current

      mutate({ name: "Flexibility" })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(newClassType)
      expect(createClassType).toHaveBeenCalledWith({ name: "Flexibility" })
    })

    it("should handle creation error", async () => {
      const error = new Error("Failed to create class type")
      vi.mocked(createClassType).mockRejectedValue(error)

      const { result } = renderHook(() => useCreateClassType(), {
        wrapper: createWrapper(),
      })

      const { mutate } = result.current

      mutate({ name: "Invalid" })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toBe(error)
    })
  })

  describe("useUpdateClassType", () => {
    it("should update class type", async () => {
      const updatedClassType = {
        id: "1",
        name: "Advanced Strength",
        active: true,
      }
      vi.mocked(updateClassType).mockResolvedValue(updatedClassType)

      const { result } = renderHook(() => useUpdateClassType(), {
        wrapper: createWrapper(),
      })

      const { mutate } = result.current

      mutate({ id: "1", name: "Advanced Strength" })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(updatedClassType)
      expect(updateClassType).toHaveBeenCalledWith({
        id: "1",
        name: "Advanced Strength",
      })
    })

    it("should handle update error", async () => {
      const error = new Error("Failed to update class type")
      vi.mocked(updateClassType).mockRejectedValue(error)

      const { result } = renderHook(() => useUpdateClassType(), {
        wrapper: createWrapper(),
      })

      const { mutate } = result.current

      mutate({ id: "1", name: "Updated" })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toBe(error)
    })
  })

  describe("useDeleteClassType", () => {
    it("should delete class type", async () => {
      vi.mocked(deleteClassType).mockResolvedValue(undefined)

      const { result } = renderHook(() => useDeleteClassType(), {
        wrapper: createWrapper(),
      })

      const { mutate } = result.current

      mutate("1")

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(deleteClassType).toHaveBeenCalledWith("1")
    })

    it("should handle deletion error", async () => {
      const error = new Error("Failed to delete class type")
      vi.mocked(deleteClassType).mockRejectedValue(error)

      const { result } = renderHook(() => useDeleteClassType(), {
        wrapper: createWrapper(),
      })

      const { mutate } = result.current

      mutate("1")

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toBe(error)
    })
  })
})
