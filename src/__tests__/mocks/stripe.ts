/**
 * Stripe Mock for Testing
 *
 * Mocks Stripe integration to prevent actual API calls during testing.
 */

import { vi } from "vitest"

export const mockCreatePaymentLink = vi.fn().mockResolvedValue({
  success: true,
  url: "https://checkout.stripe.com/pay/mock-payment-link",
})

export const mockCreateCheckoutSession = vi.fn().mockResolvedValue({
  id: "mock-session-id",
  url: "https://checkout.stripe.com/session/mock-session-id",
})

// Reset stripe mocks
export function resetStripeMocks() {
  mockCreatePaymentLink.mockReset()
  mockCreateCheckoutSession.mockReset()

  // Restore default implementations
  mockCreatePaymentLink.mockResolvedValue({
    success: true,
    url: "https://checkout.stripe.com/pay/mock-payment-link",
  })
  mockCreateCheckoutSession.mockResolvedValue({
    id: "mock-session-id",
    url: "https://checkout.stripe.com/session/mock-session-id",
  })
}

// Setup module mock
vi.mock("@/lib/stripe", () => ({
  createPaymentLink: mockCreatePaymentLink,
  createCheckoutSession: mockCreateCheckoutSession,
}))
