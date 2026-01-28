import { describe, it, expect, vi, beforeEach, afterAll } from "vitest"

const mockPaymentLinksCreate = vi.hoisted(() => vi.fn())
const mockWebhooksConstructEvent = vi.hoisted(() => vi.fn())
const mockStripeInstance = vi.hoisted(() => ({
  paymentLinks: { create: mockPaymentLinksCreate },
  webhooks: { constructEvent: mockWebhooksConstructEvent },
}))

const originalEnv = vi.hoisted(() => {
  const orig = { ...process.env }
  process.env.STRIPE_SECRET_KEY = "sk_test_123"
  return orig
})

vi.mock("stripe", () => {
  return {
    default: vi.fn(() => mockStripeInstance),
  }
})

import {
  ensureStripe,
  createPaymentLink,
  verifyWebhookSignature,
  stripe,
} from "@/lib/stripe"

describe("stripe.ts", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterAll(() => {
    process.env = originalEnv
  })

  describe("stripe instance", () => {
    it("is defined when STRIPE_SECRET_KEY is set", () => {
      expect(stripe).toBeDefined()
      expect(stripe).not.toBeNull()
    })
  })

  describe("ensureStripe", () => {
    it("returns stripe instance when configured", () => {
      const result = ensureStripe()
      expect(result).toBeDefined()
      expect(result).toBe(stripe)
    })
  })

  describe("createPaymentLink", () => {
    it("returns success with url and id", async () => {
      mockPaymentLinksCreate.mockResolvedValue({
        id: "plink_test_123",
        url: "https://pay.stripe.com/test",
      })

      const result = await createPaymentLink({
        amount: 5000,
        description: "Test Invoice",
        metadata: { invoiceId: "inv_123" },
      })

      expect(result).toEqual({
        success: true,
        url: "https://pay.stripe.com/test",
        id: "plink_test_123",
      })

      expect(mockPaymentLinksCreate).toHaveBeenCalledWith({
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: { name: "Test Invoice" },
              unit_amount: 5000,
            },
            quantity: 1,
          },
        ],
        metadata: { invoiceId: "inv_123" },
        after_completion: {
          type: "hosted_confirmation",
          hosted_confirmation: { custom_message: "Thank you for your payment!" },
        },
      })
    })

    it("uses empty metadata when not provided", async () => {
      mockPaymentLinksCreate.mockResolvedValue({
        id: "plink_test_456",
        url: "https://pay.stripe.com/test2",
      })

      const result = await createPaymentLink({
        amount: 3000,
        description: "Another Invoice",
      })

      expect(result).toEqual({
        success: true,
        url: "https://pay.stripe.com/test2",
        id: "plink_test_456",
      })

      expect(mockPaymentLinksCreate).toHaveBeenCalledWith(
        expect.objectContaining({ metadata: {} })
      )
    })

    it("returns error when Stripe API fails", async () => {
      mockPaymentLinksCreate.mockRejectedValue(new Error("Invalid amount"))

      const result = await createPaymentLink({
        amount: -100,
        description: "Invalid",
      })

      expect(result).toEqual({
        success: false,
        error: "Invalid amount",
      })
    })

    it("returns Unknown error for non-Error exceptions", async () => {
      mockPaymentLinksCreate.mockRejectedValue("string error")

      const result = await createPaymentLink({
        amount: 1000,
        description: "Test",
      })

      expect(result).toEqual({
        success: false,
        error: "Unknown error",
      })
    })
  })

  describe("verifyWebhookSignature", () => {
    it("returns event on valid signature", () => {
      const mockEvent = {
        id: "evt_test_123",
        type: "payment_intent.succeeded",
        data: { object: {} },
      }

      mockWebhooksConstructEvent.mockReturnValue(mockEvent)

      const result = verifyWebhookSignature(
        '{"test":"payload"}',
        "valid_signature",
        "whsec_test_secret"
      )

      expect(result).toEqual(mockEvent)
      expect(mockWebhooksConstructEvent).toHaveBeenCalledWith(
        '{"test":"payload"}',
        "valid_signature",
        "whsec_test_secret"
      )
    })

    it("returns null on invalid signature", () => {
      mockWebhooksConstructEvent.mockImplementation(() => {
        throw new Error("Invalid signature")
      })

      const result = verifyWebhookSignature(
        '{"test":"payload"}',
        "invalid_signature",
        "whsec_test_secret"
      )

      expect(result).toBeNull()
    })

    it("handles Buffer payload", () => {
      const mockEvent = {
        id: "evt_test_456",
        type: "charge.succeeded",
        data: { object: {} },
      }

      mockWebhooksConstructEvent.mockReturnValue(mockEvent)

      const payload = Buffer.from('{"test":"payload"}')
      const result = verifyWebhookSignature(payload, "signature", "secret")

      expect(result).toEqual(mockEvent)
      expect(mockWebhooksConstructEvent).toHaveBeenCalledWith(
        payload,
        "signature",
        "secret"
      )
    })
  })
})
