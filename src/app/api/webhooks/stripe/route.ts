import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { verifyWebhookSignature } from "@/lib/stripe"
import { prisma } from "@/lib/prisma"
import { PaymentStatus } from "@prisma/client"
import {
  handleCheckoutCompleted,
  handleSubscriptionCreated,
  handleSubscriptionUpdated,
  handleSubscriptionDeleted,
  handleInvoicePaid,
  handleInvoicePaymentFailed,
} from "@/app/actions/stripe-billing"

export async function POST(req: NextRequest) {
  try {
    const body = await req.text()
    const headersList = await headers()
    const signature = headersList.get("stripe-signature")

    if (!signature) {
      return NextResponse.json(
        { error: "Missing stripe-signature header" },
        { status: 400 }
      )
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
    if (!webhookSecret) {
      console.error("STRIPE_WEBHOOK_SECRET is not configured")
      return NextResponse.json(
        { error: "Webhook secret not configured" },
        { status: 500 }
      )
    }

    // Verify webhook signature
    const event = verifyWebhookSignature(body, signature, webhookSecret)
    if (!event) {
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 400 }
      )
    }

    // Handle the event
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object
        const metadata = (session.metadata ?? {}) as Record<string, string>

        // Membership checkout
        if (metadata.type === "membership") {
          await handleCheckoutCompleted(metadata, session.id)
          break
        }

        // Legacy invoice checkout
        const invoiceId = metadata.invoiceId
        if (!invoiceId) {
          console.warn("Checkout session completed without recognized metadata")
          break
        }

        await prisma.invoice.update({
          where: { id: parseInt(invoiceId) },
          data: {
            paymentStatus: PaymentStatus.PAID,
            paidAt: new Date(),
          },
        })

        break
      }

      case "customer.subscription.created": {
        const subscription = event.data.object
        const metadata = (subscription.metadata ?? {}) as Record<string, string>
        await handleSubscriptionCreated(subscription.id, metadata)
        break
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object
        await handleSubscriptionUpdated(
          subscription.id,
          subscription.status,
          subscription.cancel_at_period_end
        )
        break
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object
        await handleSubscriptionDeleted(subscription.id)
        break
      }

      case "invoice.paid": {
        const invoice = event.data.object
        const subscriptionId =
          typeof invoice.subscription === "string"
            ? invoice.subscription
            : invoice.subscription?.toString() ?? null
        await handleInvoicePaid(subscriptionId)
        break
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object
        const subscriptionId =
          typeof invoice.subscription === "string"
            ? invoice.subscription
            : invoice.subscription?.toString() ?? null
        await handleInvoicePaymentFailed(subscriptionId)
        break
      }

      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object
        const invoiceId = paymentIntent.metadata?.invoiceId

        if (!invoiceId) break

        await prisma.invoice.update({
          where: { id: parseInt(invoiceId) },
          data: {
            paymentStatus: PaymentStatus.PAID,
            paidAt: new Date(),
          },
        })

        break
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object
        const invoiceId = paymentIntent.metadata?.invoiceId

        if (!invoiceId) break
        console.error(`Payment failed for invoice ${invoiceId}`)
        break
      }

      default:
        console.warn(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("Webhook error:", error)
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    )
  }
}
