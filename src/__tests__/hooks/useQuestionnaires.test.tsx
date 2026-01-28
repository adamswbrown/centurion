import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ReactNode } from "react"

vi.mock("@/app/actions/questionnaires", () => ({
  getQuestionnaireBundle: vi.fn(),
  getQuestionnaireBundles: vi.fn(),
  createQuestionnaireBundle: vi.fn(),
  updateQuestionnaireBundle: vi.fn(),
  getQuestionnaireResponse: vi.fn(),
  upsertQuestionnaireResponse: vi.fn(),
  getWeeklyResponses: vi.fn(),
  getAllQuestionnaires: vi.fn(),
  getQuestionnaireStatusForCoach: vi.fn(),
}))

import {
  getQuestionnaireBundle,
  getQuestionnaireBundles,
  createQuestionnaireBundle,
  updateQuestionnaireBundle,
  getQuestionnaireResponse,
  upsertQuestionnaireResponse,
  getWeeklyResponses,
  getAllQuestionnaires,
  getQuestionnaireStatusForCoach,
} from "@/app/actions/questionnaires"
import {
  useQuestionnaireBundle,
  useQuestionnaireBundles,
  useQuestionnaireResponse,
  useWeeklyResponses,
  useCreateQuestionnaireBundle,
  useUpdateQuestionnaireBundle,
  useUpsertQuestionnaireResponse,
  useQuestionnaires,
  useQuestionnaireStatusForCoach,
} from "@/hooks/useQuestionnaires"

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
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
  }
}

describe("useQuestionnaireBundle", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("fetches questionnaire bundle successfully", async () => {
    const mockBundle = {
      id: 1,
      cohortId: 1,
      weekNumber: 1,
      questions: { elements: [] },
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    vi.mocked(getQuestionnaireBundle).mockResolvedValue(mockBundle)

    const { result } = renderHook(() => useQuestionnaireBundle(1, 1), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(mockBundle)
    expect(getQuestionnaireBundle).toHaveBeenCalledWith(1, 1)
  })

  it("handles error state", async () => {
    vi.mocked(getQuestionnaireBundle).mockRejectedValue(
      new Error("Failed to fetch bundle")
    )

    const { result } = renderHook(() => useQuestionnaireBundle(1, 1), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toEqual(new Error("Failed to fetch bundle"))
  })

  it("is disabled when cohortId is not provided", () => {
    const { result } = renderHook(() => useQuestionnaireBundle(0, 1), {
      wrapper: createWrapper(),
    })

    expect(result.current.fetchStatus).toBe("idle")
    expect(getQuestionnaireBundle).not.toHaveBeenCalled()
  })

  it("is disabled when weekNumber is not provided", () => {
    const { result } = renderHook(() => useQuestionnaireBundle(1, 0), {
      wrapper: createWrapper(),
    })

    expect(result.current.fetchStatus).toBe("idle")
    expect(getQuestionnaireBundle).not.toHaveBeenCalled()
  })
})

describe("useQuestionnaireBundles", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("fetches questionnaire bundles successfully", async () => {
    const mockBundles = [
      {
        id: 1,
        cohortId: 1,
        weekNumber: 1,
        questions: { elements: [] },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 2,
        cohortId: 1,
        weekNumber: 2,
        questions: { elements: [] },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]

    vi.mocked(getQuestionnaireBundles).mockResolvedValue(mockBundles)

    const { result } = renderHook(() => useQuestionnaireBundles(1), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(mockBundles)
    expect(getQuestionnaireBundles).toHaveBeenCalledWith(1)
  })

  it("handles error state", async () => {
    vi.mocked(getQuestionnaireBundles).mockRejectedValue(
      new Error("Failed to fetch bundles")
    )

    const { result } = renderHook(() => useQuestionnaireBundles(1), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toEqual(new Error("Failed to fetch bundles"))
  })

  it("is disabled when cohortId is not provided", () => {
    const { result } = renderHook(() => useQuestionnaireBundles(0), {
      wrapper: createWrapper(),
    })

    expect(result.current.fetchStatus).toBe("idle")
    expect(getQuestionnaireBundles).not.toHaveBeenCalled()
  })
})

describe("useQuestionnaireResponse", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("fetches questionnaire response successfully", async () => {
    const mockResponse = {
      id: 1,
      cohortId: 1,
      userId: "user1",
      weekNumber: 1,
      responseData: { answers: {} },
      submittedAt: new Date(),
      coachReviewed: false,
    }

    vi.mocked(getQuestionnaireResponse).mockResolvedValue(mockResponse)

    const { result } = renderHook(() => useQuestionnaireResponse(1, 1), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(mockResponse)
    expect(getQuestionnaireResponse).toHaveBeenCalledWith(1, 1)
  })

  it("handles error state", async () => {
    vi.mocked(getQuestionnaireResponse).mockRejectedValue(
      new Error("Failed to fetch response")
    )

    const { result } = renderHook(() => useQuestionnaireResponse(1, 1), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toEqual(new Error("Failed to fetch response"))
  })

  it("is disabled when cohortId is not provided", () => {
    const { result } = renderHook(() => useQuestionnaireResponse(0, 1), {
      wrapper: createWrapper(),
    })

    expect(result.current.fetchStatus).toBe("idle")
    expect(getQuestionnaireResponse).not.toHaveBeenCalled()
  })

  it("is disabled when weekNumber is not provided", () => {
    const { result } = renderHook(() => useQuestionnaireResponse(1, 0), {
      wrapper: createWrapper(),
    })

    expect(result.current.fetchStatus).toBe("idle")
    expect(getQuestionnaireResponse).not.toHaveBeenCalled()
  })
})

describe("useWeeklyResponses", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("fetches weekly responses successfully", async () => {
    const mockResponses = [
      {
        id: 1,
        cohortId: 1,
        userId: "user1",
        weekNumber: 1,
        responseData: { answers: {} },
        submittedAt: new Date(),
        coachReviewed: false,
      },
      {
        id: 2,
        cohortId: 1,
        userId: "user2",
        weekNumber: 1,
        responseData: { answers: {} },
        submittedAt: new Date(),
        coachReviewed: true,
      },
    ]

    vi.mocked(getWeeklyResponses).mockResolvedValue(mockResponses)

    const { result } = renderHook(() => useWeeklyResponses(1, 1), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(mockResponses)
    expect(getWeeklyResponses).toHaveBeenCalledWith(1, 1)
  })

  it("handles error state", async () => {
    vi.mocked(getWeeklyResponses).mockRejectedValue(
      new Error("Failed to fetch responses")
    )

    const { result } = renderHook(() => useWeeklyResponses(1, 1), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toEqual(
      new Error("Failed to fetch responses")
    )
  })

  it("is disabled when cohortId is not provided", () => {
    const { result } = renderHook(() => useWeeklyResponses(0, 1), {
      wrapper: createWrapper(),
    })

    expect(result.current.fetchStatus).toBe("idle")
    expect(getWeeklyResponses).not.toHaveBeenCalled()
  })

  it("is disabled when weekNumber is not provided", () => {
    const { result } = renderHook(() => useWeeklyResponses(1, 0), {
      wrapper: createWrapper(),
    })

    expect(result.current.fetchStatus).toBe("idle")
    expect(getWeeklyResponses).not.toHaveBeenCalled()
  })
})

describe("useCreateQuestionnaireBundle", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("creates questionnaire bundle successfully", async () => {
    const mockBundle = {
      id: 1,
      cohortId: 1,
      weekNumber: 1,
      questions: { elements: [] },
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    vi.mocked(createQuestionnaireBundle).mockResolvedValue(mockBundle)

    const { result } = renderHook(() => useCreateQuestionnaireBundle(), {
      wrapper: createWrapper(),
    })

    const input = {
      cohortId: 1,
      weekNumber: 1,
      questions: { elements: [] },
    }

    result.current.mutate(input)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(mockBundle)
    expect(createQuestionnaireBundle).toHaveBeenCalledWith(input)
  })

  it("handles error state", async () => {
    vi.mocked(createQuestionnaireBundle).mockRejectedValue(
      new Error("Failed to create bundle")
    )

    const { result } = renderHook(() => useCreateQuestionnaireBundle(), {
      wrapper: createWrapper(),
    })

    const input = {
      cohortId: 1,
      weekNumber: 1,
      questions: { elements: [] },
    }

    result.current.mutate(input)

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toEqual(new Error("Failed to create bundle"))
  })
})

describe("useUpdateQuestionnaireBundle", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("updates questionnaire bundle successfully", async () => {
    const mockBundle = {
      id: 1,
      cohortId: 1,
      weekNumber: 1,
      questions: { elements: [] },
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    vi.mocked(updateQuestionnaireBundle).mockResolvedValue(mockBundle)

    const { result } = renderHook(() => useUpdateQuestionnaireBundle(), {
      wrapper: createWrapper(),
    })

    const input = {
      cohortId: 1,
      weekNumber: 1,
      questions: { elements: [] },
    }

    result.current.mutate(input)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(mockBundle)
    expect(updateQuestionnaireBundle).toHaveBeenCalledWith(
      1,
      1,
      { elements: [] }
    )
  })

  it("handles error state", async () => {
    vi.mocked(updateQuestionnaireBundle).mockRejectedValue(
      new Error("Failed to update bundle")
    )

    const { result } = renderHook(() => useUpdateQuestionnaireBundle(), {
      wrapper: createWrapper(),
    })

    const input = {
      cohortId: 1,
      weekNumber: 1,
      questions: { elements: [] },
    }

    result.current.mutate(input)

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toEqual(new Error("Failed to update bundle"))
  })
})

describe("useUpsertQuestionnaireResponse", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("upserts questionnaire response successfully", async () => {
    const mockResponse = {
      id: 1,
      cohortId: 1,
      userId: "user1",
      weekNumber: 1,
      responseData: { answers: {} },
      submittedAt: new Date(),
      coachReviewed: false,
    }

    vi.mocked(upsertQuestionnaireResponse).mockResolvedValue(mockResponse)

    const { result } = renderHook(() => useUpsertQuestionnaireResponse(), {
      wrapper: createWrapper(),
    })

    const input = {
      cohortId: 1,
      weekNumber: 1,
      responseData: { answers: {} },
    }

    result.current.mutate(input)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(mockResponse)
    expect(upsertQuestionnaireResponse).toHaveBeenCalledWith(input)
  })

  it("handles error state", async () => {
    vi.mocked(upsertQuestionnaireResponse).mockRejectedValue(
      new Error("Failed to upsert response")
    )

    const { result } = renderHook(() => useUpsertQuestionnaireResponse(), {
      wrapper: createWrapper(),
    })

    const input = {
      cohortId: 1,
      weekNumber: 1,
      responseData: { answers: {} },
    }

    result.current.mutate(input)

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toEqual(
      new Error("Failed to upsert response")
    )
  })
})

describe("useQuestionnaires", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("fetches all questionnaires successfully", async () => {
    const mockQuestionnaires = [
      {
        id: 1,
        cohortId: 1,
        weekNumber: 1,
        questions: { elements: [] },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 2,
        cohortId: 2,
        weekNumber: 1,
        questions: { elements: [] },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]

    vi.mocked(getAllQuestionnaires).mockResolvedValue(mockQuestionnaires)

    const { result } = renderHook(() => useQuestionnaires(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(mockQuestionnaires)
    expect(getAllQuestionnaires).toHaveBeenCalled()
  })

  it("handles error state", async () => {
    vi.mocked(getAllQuestionnaires).mockRejectedValue(
      new Error("Failed to fetch questionnaires")
    )

    const { result } = renderHook(() => useQuestionnaires(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toEqual(
      new Error("Failed to fetch questionnaires")
    )
  })
})

describe("useQuestionnaireStatusForCoach", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("fetches questionnaire status successfully", async () => {
    const mockStatus = {
      cohortId: 1,
      weekNumber: 1,
      totalResponses: 5,
      reviewedResponses: 3,
    }

    vi.mocked(getQuestionnaireStatusForCoach).mockResolvedValue(mockStatus)

    const { result } = renderHook(
      () => useQuestionnaireStatusForCoach(1, 1),
      {
        wrapper: createWrapper(),
      }
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(mockStatus)
    expect(getQuestionnaireStatusForCoach).toHaveBeenCalledWith(1, 1)
  })

  it("handles error state", async () => {
    vi.mocked(getQuestionnaireStatusForCoach).mockRejectedValue(
      new Error("Failed to fetch status")
    )

    const { result } = renderHook(
      () => useQuestionnaireStatusForCoach(1, 1),
      {
        wrapper: createWrapper(),
      }
    )

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toEqual(new Error("Failed to fetch status"))
  })

  it("works with undefined parameters", async () => {
    const mockStatus = {
      cohortId: null,
      weekNumber: null,
      totalResponses: 10,
      reviewedResponses: 7,
    }

    vi.mocked(getQuestionnaireStatusForCoach).mockResolvedValue(mockStatus)

    const { result } = renderHook(
      () => useQuestionnaireStatusForCoach(undefined, undefined),
      {
        wrapper: createWrapper(),
      }
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(mockStatus)
    expect(getQuestionnaireStatusForCoach).toHaveBeenCalledWith(
      undefined,
      undefined
    )
  })
})
