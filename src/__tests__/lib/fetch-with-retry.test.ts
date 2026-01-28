import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { fetchWithRetry } from "@/lib/fetch-with-retry"

describe("fetchWithRetry", () => {
  let mockFetch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockFetch = vi.fn()
    global.fetch = mockFetch
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe("successful requests", () => {
    it("returns response on success (200)", async () => {
      const mockResponse = new Response("success", { status: 200 })
      mockFetch.mockResolvedValueOnce(mockResponse)

      const response = await fetchWithRetry("https://api.example.com/data", undefined, {
        retries: 0,
      })
      expect(response).toBe(mockResponse)
      expect(response.status).toBe(200)
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it("returns response on 201 Created", async () => {
      mockFetch.mockResolvedValueOnce(new Response("created", { status: 201 }))

      const response = await fetchWithRetry("https://api.example.com/data", undefined, {
        retries: 0,
      })
      expect(response.status).toBe(201)
    })

    it("returns response on 204 No Content", async () => {
      mockFetch.mockResolvedValueOnce(new Response(null, { status: 204 }))

      const response = await fetchWithRetry("https://api.example.com/data", undefined, {
        retries: 0,
      })
      expect(response.status).toBe(204)
    })
  })

  describe("non-retryable error responses", () => {
    it("returns 404 directly without retrying", async () => {
      mockFetch.mockResolvedValueOnce(
        new Response("not found", { status: 404, statusText: "Not Found" })
      )

      const response = await fetchWithRetry("https://api.example.com/data", undefined, {
        retries: 3,
      })
      expect(response.status).toBe(404)
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it("returns 400 directly without retrying", async () => {
      mockFetch.mockResolvedValueOnce(
        new Response("bad request", { status: 400, statusText: "Bad Request" })
      )

      const response = await fetchWithRetry("https://api.example.com/data", undefined, {
        retries: 3,
      })
      expect(response.status).toBe(400)
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it("returns 401 directly without retrying", async () => {
      mockFetch.mockResolvedValueOnce(
        new Response("unauthorized", { status: 401, statusText: "Unauthorized" })
      )

      const response = await fetchWithRetry("https://api.example.com/data", undefined, {
        retries: 3,
      })
      expect(response.status).toBe(401)
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })
  })

  describe("retryable HTTP status codes", () => {
    it("retries on 500 and eventually succeeds", async () => {
      mockFetch
        .mockResolvedValueOnce(
          new Response("error", { status: 500, statusText: "Internal Server Error" })
        )
        .mockResolvedValueOnce(new Response("success", { status: 200 }))

      const response = await fetchWithRetry("https://api.example.com/data", undefined, {
        retries: 1,
        initialDelay: 0,
        maxDelay: 0,
      })
      expect(response.status).toBe(200)
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    it("retries on 429 and eventually succeeds", async () => {
      mockFetch
        .mockResolvedValueOnce(
          new Response("rate limited", { status: 429, statusText: "Too Many Requests" })
        )
        .mockResolvedValueOnce(new Response("success", { status: 200 }))

      const response = await fetchWithRetry("https://api.example.com/data", undefined, {
        retries: 1,
        initialDelay: 0,
        maxDelay: 0,
      })
      expect(response.status).toBe(200)
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    it("retries on 503 and eventually succeeds", async () => {
      mockFetch
        .mockResolvedValueOnce(
          new Response("unavailable", { status: 503, statusText: "Service Unavailable" })
        )
        .mockResolvedValueOnce(new Response("success", { status: 200 }))

      const response = await fetchWithRetry("https://api.example.com/data", undefined, {
        retries: 1,
        initialDelay: 0,
        maxDelay: 0,
      })
      expect(response.status).toBe(200)
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    it("throws after exhausting retries on 503", async () => {
      mockFetch.mockResolvedValue(
        new Response("unavailable", { status: 503, statusText: "Service Unavailable" })
      )

      await expect(
        fetchWithRetry("https://api.example.com/data", undefined, {
          retries: 2,
          initialDelay: 0,
          maxDelay: 0,
        })
      ).rejects.toThrow("HTTP 503: Service Unavailable")
      expect(mockFetch).toHaveBeenCalledTimes(3)
    })

    it("throws after exhausting retries on 500", async () => {
      mockFetch.mockResolvedValue(
        new Response("error", { status: 500, statusText: "Internal Server Error" })
      )

      await expect(
        fetchWithRetry("https://api.example.com/data", undefined, {
          retries: 1,
          initialDelay: 0,
          maxDelay: 0,
        })
      ).rejects.toThrow("HTTP 500: Internal Server Error")
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })
  })

  describe("network errors", () => {
    it("retries on network error and eventually succeeds", async () => {
      mockFetch
        .mockRejectedValueOnce(new Error("Network error"))
        .mockResolvedValueOnce(new Response("success", { status: 200 }))

      const response = await fetchWithRetry("https://api.example.com/data", undefined, {
        retries: 1,
        initialDelay: 0,
        maxDelay: 0,
      })
      expect(response.status).toBe(200)
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    it("throws after exhausting retries on network error", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"))

      await expect(
        fetchWithRetry("https://api.example.com/data", undefined, {
          retries: 2,
          initialDelay: 0,
          maxDelay: 0,
        })
      ).rejects.toThrow("Network error")
      expect(mockFetch).toHaveBeenCalledTimes(3)
    })

    it("retries on TypeError (fetch failure) and eventually succeeds", async () => {
      mockFetch
        .mockRejectedValueOnce(new TypeError("Failed to fetch"))
        .mockResolvedValueOnce(new Response("success", { status: 200 }))

      const response = await fetchWithRetry("https://api.example.com/data", undefined, {
        retries: 1,
        initialDelay: 0,
        maxDelay: 0,
      })
      expect(response.status).toBe(200)
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    it("handles non-Error objects thrown by fetch", async () => {
      mockFetch
        .mockRejectedValueOnce("string error")
        .mockResolvedValueOnce(new Response("success", { status: 200 }))

      const response = await fetchWithRetry("https://api.example.com/data", undefined, {
        retries: 1,
        initialDelay: 0,
        maxDelay: 0,
      })
      expect(response.status).toBe(200)
    })
  })

  describe("abort handling", () => {
    it("throws on user-initiated abort without retrying", async () => {
      const abortController = new AbortController()
      abortController.abort()

      mockFetch.mockRejectedValue(new DOMException("Aborted", "AbortError"))

      await expect(
        fetchWithRetry(
          "https://api.example.com/data",
          { signal: abortController.signal },
          { retries: 3, initialDelay: 0, maxDelay: 0 }
        )
      ).rejects.toThrow("Aborted")
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })
  })

  describe("custom options", () => {
    it("respects custom retryOnStatus", async () => {
      mockFetch
        .mockResolvedValueOnce(
          new Response("error", { status: 418, statusText: "I'm a teapot" })
        )
        .mockResolvedValueOnce(new Response("success", { status: 200 }))

      const response = await fetchWithRetry("https://api.example.com/data", undefined, {
        retries: 1,
        retryOnStatus: [418],
        initialDelay: 0,
        maxDelay: 0,
      })
      expect(response.status).toBe(200)
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    it("does not retry on 500 when custom retryOnStatus excludes it", async () => {
      mockFetch.mockResolvedValueOnce(
        new Response("error", { status: 500, statusText: "Internal Server Error" })
      )

      const response = await fetchWithRetry("https://api.example.com/data", undefined, {
        retries: 3,
        retryOnStatus: [429],
      })
      expect(response.status).toBe(500)
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it("respects retries=0 (no retries)", async () => {
      mockFetch.mockResolvedValueOnce(
        new Response("error", { status: 500, statusText: "Internal Server Error" })
      )

      await expect(
        fetchWithRetry("https://api.example.com/data", undefined, {
          retries: 0,
        })
      ).rejects.toThrow("HTTP 500: Internal Server Error")
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it("respects retries=1 (one retry)", async () => {
      mockFetch.mockResolvedValue(
        new Response("error", { status: 500, statusText: "Internal Server Error" })
      )

      await expect(
        fetchWithRetry("https://api.example.com/data", undefined, {
          retries: 1,
          initialDelay: 0,
          maxDelay: 0,
        })
      ).rejects.toThrow("HTTP 500: Internal Server Error")
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })
  })

  describe("request configuration", () => {
    it("passes request init options to fetch", async () => {
      mockFetch.mockResolvedValueOnce(new Response("success", { status: 200 }))

      const init: RequestInit = {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ test: "data" }),
      }

      await fetchWithRetry("https://api.example.com/data", init, { retries: 0 })

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.example.com/data",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ test: "data" }),
        })
      )
    })

    it("handles URL objects as input", async () => {
      mockFetch.mockResolvedValueOnce(new Response("success", { status: 200 }))

      const url = new URL("https://api.example.com/data")
      const response = await fetchWithRetry(url, undefined, { retries: 0 })
      expect(response.status).toBe(200)
      expect(mockFetch).toHaveBeenCalledWith(url, expect.any(Object))
    })
  })

  describe("edge cases", () => {
    it("handles empty options object", async () => {
      mockFetch.mockResolvedValueOnce(new Response("success", { status: 200 }))

      const response = await fetchWithRetry("https://api.example.com/data", undefined, {})
      expect(response.status).toBe(200)
    })

    it("handles undefined options", async () => {
      mockFetch.mockResolvedValueOnce(new Response("success", { status: 200 }))

      const response = await fetchWithRetry("https://api.example.com/data")
      expect(response.status).toBe(200)
    })
  })
})
