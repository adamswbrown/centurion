import Stripe from "stripe"

const stripeSecretKey = process.env.STRIPE_SECRET_KEY

if (!stripeSecretKey && process.env.NODE_ENV !== "production") {
  console.warn("STRIPE_SECRET_KEY environment variable is not configured")
}

export const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, {
      apiVersion: "2025-12-15.clover",
      typescript: true,
    })
  : null

export function ensureStripe() {
  if (!stripe) {
    throw new Error("STRIPE_SECRET_KEY environment variable is not configured")
  }
  return stripe
}

// Create Stripe Payment Link for an invoice
export async function createPaymentLink(params: {
  amount: number // in cents
  description: string
  metadata?: Record<string, string>
}): Promise<
  | { success: true; url: string; id: string }
  | { success: false; error: string }
> {
  try {
    const stripeClient = ensureStripe()
    const paymentLink = await stripeClient.paymentLinks.create({
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: params.description,
            },
            unit_amount: params.amount,
          },
          quantity: 1,
        },
      ],
      metadata: params.metadata || {},
      after_completion: {
        type: "hosted_confirmation",
        hosted_confirmation: {
          custom_message: "Thank you for your payment!",
        },
      },
    })

    return {
      success: true,
      url: paymentLink.url,
      id: paymentLink.id,
    }
  } catch (error) {
    console.error("Failed to create Stripe payment link:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

// Verify Stripe webhook signature
export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string,
  secret: string,
): Stripe.Event | null {
  try {
    const stripeClient = ensureStripe()
    return stripeClient.webhooks.constructEvent(payload, signature, secret)
  } catch (error) {
    console.error("Webhook signature verification failed:", error)
    return null
  }
}
