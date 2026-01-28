/**
 * Tests for POST /api/webhooks/stripe
 * Validates Stripe webhook event handling
 */

import { describe, it, expect, beforeEach, vi } from "vitest"
import { POST } from "@/app/api/webhooks/stripe/route"
import { PaymentStatus } from "@prisma/client"

// Mock variables for stripe and billing actions
const mockVerifyWebhookSignature = vi.hoisted(() => vi.fn())
const mockHandleCheckoutCompleted = vi.hoisted(() => vi.fn())
const mockHandleSubscriptionCreated = vi.hoisted(() => vi.fn())
const mockHandleSubscriptionUpdated = vi.hoisted(() => vi.fn())
const mockHandleSubscriptionDeleted = vi.hoisted(() => vi.fn())
const mockHandleInvoicePaid = vi.hoisted(() => vi.fn())
const mockHandleInvoicePaymentFailed = vi.hoisted(() => vi.fn())
const mockHeadersGet = vi.hoisted(() => vi.fn())

// Mock prisma
const mockPrisma = vi.hoisted(() => ({
  invoice: {
    update: vi.fn(),
  },
}))

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}))

vi.mock("@/lib/stripe", () => ({
  verifyWebhookSignature: mockVerifyWebhookSignature,
}))

vi.mock("@/app/actions/stripe-billing", () => ({
  handleCheckoutCompleted: mockHandleCheckoutCompleted,
  handleSubscriptionCreated: mockHandleSubscriptionCreated,
  handleSubscriptionUpdated: mockHandleSubscriptionUpdated,
  handleSubscriptionDeleted: mockHandleSubscriptionDeleted,
  handleInvoicePaid: mockHandleInvoicePaid,
  handleInvoicePaymentFailed: mockHandleInvoicePaymentFailed,
}))

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => ({
    get: mockHeadersGet,
  })),
}))

// Mock next/server with proper NextResponse implementation
vi.mock("next/server", () => {
  class MockHeaders {
    private map = new Map<string, string>()
    set(key: string, value: string) {
      this.map.set(key, value)
    }
    get(key: string) {
      return this.map.get(key) ?? null
    }
  }

  class MockNextResponse {
    _data: unknown
    status: number
    headers: MockHeaders

    constructor(body: unknown, init?: { status?: number }) {
      this._data = body
      this.status = init?.status ?? 200
      this.headers = new MockHeaders()
    }

    async json() {
      return this._data
    }

    static json(data: unknown, init?: { status?: number }) {
      const resp = new MockNextResponse(data, init)
      resp._data = data
      return resp
    }
  }

  return {
    NextRequest: vi.fn(),
    NextResponse: MockNextResponse,
  }
})

// Helper to create mock Stripe webhook request
function createStripeRequest(body: string) {
  return {
    text: async () => body,
  } as any
}

describe("POST /api/webhooks/stripe", () => {
  const mockSignature = "t=1234567890,v1=signature_hash"
  const webhookSecret = "whsec_test_secret"

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.STRIPE_WEBHOOK_SECRET = webhookSecret
    mockHeadersGet.mockReturnValue(mockSignature)
  })

  describe("Request validation", () => {
    it("returns 400 when missing stripe-signature header", async () => {
      mockHeadersGet.mockReturnValue(null)

      const request = createStripeRequest(JSON.stringify({ type: "test.event" }))
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data).toEqual({ error: "Missing stripe-signature header" })
    })

    it("returns 500 when STRIPE_WEBHOOK_SECRET not configured", async () => {
      delete process.env.STRIPE_WEBHOOK_SECRET

      const request = createStripeRequest(JSON.stringify({ type: "test.event" }))
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data).toEqual({ error: "Webhook secret not configured" })
    })

    it("returns 400 when signature verification fails", async () => {
      mockVerifyWebhookSignature.mockReturnValue(null)

      const request = createStripeRequest(JSON.stringify({ type: "test.event" }))
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data).toEqual({ error: "Invalid signature" })
      expect(mockVerifyWebhookSignature).toHaveBeenCalledWith(
        expect.any(String),
        mockSignature,
        webhookSecret
      )
    })
  })

  describe("Event handling", () => {
    beforeEach(() => {
      mockVerifyWebhookSignature.mockImplementation((body) => JSON.parse(body))
    })

    describe("checkout.session.completed", () => {
      it("handles checkout with invoiceId metadata", async () => {
        const invoiceId = 42
        const event = {
          type: "checkout.session.completed",
          data: {
            object: {
              id: "cs_test_123",
              metadata: { invoiceId: String(invoiceId) },
            },
          },
        }

        mockPrisma.invoice.update.mockResolvedValue({})

        const request = createStripeRequest(JSON.stringify(event))
        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data).toEqual({ received: true })
        expect(mockPrisma.invoice.update).toHaveBeenCalledWith({
          where: { id: invoiceId },
          data: {
            paymentStatus: PaymentStatus.PAID,
            paidAt: expect.any(Date),
          },
        })
      })

      it("handles checkout with membership metadata", async () => {
        const event = {
          type: "checkout.session.completed",
          data: {
            object: {
              id: "cs_test_456",
              metadata: {
                type: "membership",
                userId: "123",
                cohortId: "456",
              },
            },
          },
        }

        mockHandleCheckoutCompleted.mockResolvedValue(undefined)

        const request = createStripeRequest(JSON.stringify(event))
        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data).toEqual({ received: true })
        expect(mockHandleCheckoutCompleted).toHaveBeenCalledWith(
          event.data.object.metadata,
          event.data.object.id
        )
        expect(mockPrisma.invoice.update).not.toHaveBeenCalled()
      })

      it("handles checkout without recognized metadata", async () => {
        const event = {
          type: "checkout.session.completed",
          data: {
            object: {
              id: "cs_test_789",
              metadata: {},
            },
          },
        }

        const request = createStripeRequest(JSON.stringify(event))
        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data).toEqual({ received: true })
        expect(mockPrisma.invoice.update).not.toHaveBeenCalled()
        expect(mockHandleCheckoutCompleted).not.toHaveBeenCalled()
      })
    })

    describe("customer.subscription events", () => {
      it("handles subscription.created", async () => {
        const event = {
          type: "customer.subscription.created",
          data: {
            object: {
              id: "sub_123",
              metadata: {
                userId: "123",
                cohortId: "456",
              },
            },
          },
        }

        mockHandleSubscriptionCreated.mockResolvedValue(undefined)

        const request = createStripeRequest(JSON.stringify(event))
        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data).toEqual({ received: true })
        expect(mockHandleSubscriptionCreated).toHaveBeenCalledWith(
          "sub_123",
          event.data.object.metadata
        )
      })

      it("handles subscription.updated", async () => {
        const event = {
          type: "customer.subscription.updated",
          data: {
            object: {
              id: "sub_123",
              status: "active",
              cancel_at_period_end: false,
            },
          },
        }

        mockHandleSubscriptionUpdated.mockResolvedValue(undefined)

        const request = createStripeRequest(JSON.stringify(event))
        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data).toEqual({ received: true })
        expect(mockHandleSubscriptionUpdated).toHaveBeenCalledWith("sub_123", "active", false)
      })

      it("handles subscription.deleted", async () => {
        const event = {
          type: "customer.subscription.deleted",
          data: {
            object: {
              id: "sub_123",
            },
          },
        }

        mockHandleSubscriptionDeleted.mockResolvedValue(undefined)

        const request = createStripeRequest(JSON.stringify(event))
        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data).toEqual({ received: true })
        expect(mockHandleSubscriptionDeleted).toHaveBeenCalledWith("sub_123")
      })
    })

    describe("invoice events", () => {
      it("handles invoice.paid", async () => {
        const event = {
          type: "invoice.paid",
          data: {
            object: {
              id: "inv_123",
              parent: {
                subscription_details: {
                  subscription: "sub_123",
                },
              },
            },
          },
        }

        mockHandleInvoicePaid.mockResolvedValue(undefined)

        const request = createStripeRequest(JSON.stringify(event))
        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data).toEqual({ received: true })
        expect(mockHandleInvoicePaid).toHaveBeenCalledWith("sub_123")
      })

      it("handles invoice.payment_failed", async () => {
        const event = {
          type: "invoice.payment_failed",
          data: {
            object: {
              id: "inv_123",
              parent: {
                subscription_details: {
                  subscription: "sub_456",
                },
              },
            },
          },
        }

        mockHandleInvoicePaymentFailed.mockResolvedValue(undefined)

        const request = createStripeRequest(JSON.stringify(event))
        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data).toEqual({ received: true })
        expect(mockHandleInvoicePaymentFailed).toHaveBeenCalledWith("sub_456")
      })
    })

    describe("payment_intent events", () => {
      it("handles payment_intent.succeeded", async () => {
        const invoiceId = 123
        const event = {
          type: "payment_intent.succeeded",
          data: {
            object: {
              id: "pi_123",
              metadata: {
                invoiceId: String(invoiceId),
              },
            },
          },
        }

        mockPrisma.invoice.update.mockResolvedValue({})

        const request = createStripeRequest(JSON.stringify(event))
        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data).toEqual({ received: true })
        expect(mockPrisma.invoice.update).toHaveBeenCalledWith({
          where: { id: invoiceId },
          data: {
            paymentStatus: PaymentStatus.PAID,
            paidAt: expect.any(Date),
          },
        })
      })

      it("handles payment_intent.succeeded without invoiceId", async () => {
        const event = {
          type: "payment_intent.succeeded",
          data: {
            object: {
              id: "pi_456",
              metadata: {},
            },
          },
        }

        const request = createStripeRequest(JSON.stringify(event))
        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data).toEqual({ received: true })
        expect(mockPrisma.invoice.update).not.toHaveBeenCalled()
      })

      it("handles payment_intent.payment_failed", async () => {
        const invoiceId = 789
        const event = {
          type: "payment_intent.payment_failed",
          data: {
            object: {
              id: "pi_789",
              metadata: {
                invoiceId: String(invoiceId),
              },
            },
          },
        }

        const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {})

        const request = createStripeRequest(JSON.stringify(event))
        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data).toEqual({ received: true })
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining(`Payment failed for invoice ${invoiceId}`)
        )

        consoleErrorSpy.mockRestore()
      })
    })

    it("handles unrecognized event type gracefully", async () => {
      const event = {
        type: "customer.created",
        data: {
          object: {
            id: "cus_123",
          },
        },
      }

      const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})

      const request = createStripeRequest(JSON.stringify(event))
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({ received: true })
      expect(consoleWarnSpy).toHaveBeenCalledWith("Unhandled event type: customer.created")

      consoleWarnSpy.mockRestore()
    })
  })

  describe("Error handling", () => {
    it("returns 500 on unexpected error", async () => {
      mockVerifyWebhookSignature.mockImplementation(() => {
        throw new Error("Unexpected webhook processing error")
      })

      const request = createStripeRequest(JSON.stringify({ type: "test.event" }))
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data).toEqual({ error: "Webhook handler failed" })
    })

    it("returns 500 when database update fails", async () => {
      const event = {
        type: "checkout.session.completed",
        data: {
          object: {
            id: "cs_test_999",
            metadata: { invoiceId: "999" },
          },
        },
      }

      mockVerifyWebhookSignature.mockImplementation((body) => JSON.parse(body))
      mockPrisma.invoice.update.mockRejectedValue(new Error("Database error"))

      const request = createStripeRequest(JSON.stringify(event))
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data).toEqual({ error: "Webhook handler failed" })
    })
  })
})
