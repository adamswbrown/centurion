export interface FetchWithRetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  retries?: number
  /** Initial delay in ms before first retry (default: 1000) */
  initialDelay?: number
  /** Maximum delay in ms between retries (default: 10000) */
  maxDelay?: number
  /** Backoff multiplier (default: 2) */
  backoffMultiplier?: number
  /** Request timeout in ms (default: 30000) */
  timeout?: number
  /** HTTP status codes that should trigger a retry (default: [408, 429, 500, 502, 503, 504]) */
  retryOnStatus?: number[]
}

const DEFAULT_OPTIONS: Required<FetchWithRetryOptions> = {
  retries: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  timeout: 30000,
  retryOnStatus: [408, 429, 500, 502, 503, 504],
}

/**
 * Fetch with automatic retry and exponential backoff.
 *
 * Retries on network errors and configurable HTTP status codes.
 * Includes jitter to prevent thundering herd problems.
 */
export async function fetchWithRetry(
  input: RequestInfo | URL,
  init?: RequestInit,
  options?: FetchWithRetryOptions,
): Promise<Response> {
  const config = { ...DEFAULT_OPTIONS, ...options }
  let lastError: Error | undefined

  for (let attempt = 0; attempt <= config.retries; attempt++) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), config.timeout)

    try {
      const response = await fetch(input, {
        ...init,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (response.ok || !config.retryOnStatus.includes(response.status)) {
        return response
      }

      // Retryable HTTP status - will retry if attempts remain
      lastError = new Error(
        `HTTP ${response.status}: ${response.statusText}`,
      )
    } catch (error) {
      clearTimeout(timeoutId)
      lastError =
        error instanceof Error ? error : new Error(String(error))

      // Don't retry on user-initiated aborts
      if (
        init?.signal?.aborted ||
        (error instanceof DOMException && error.name === "AbortError" && !controller.signal.aborted)
      ) {
        throw lastError
      }
    }

    // If we still have retries left, wait with exponential backoff + jitter
    if (attempt < config.retries) {
      const baseDelay = Math.min(
        config.initialDelay * config.backoffMultiplier ** attempt,
        config.maxDelay,
      )
      // Add jitter: random value between 0 and baseDelay
      const jitter = Math.random() * baseDelay
      const delay = Math.floor(baseDelay + jitter) / 2
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  throw lastError ?? new Error("fetchWithRetry: all attempts exhausted")
}
