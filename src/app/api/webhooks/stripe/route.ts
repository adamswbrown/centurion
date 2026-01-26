import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { stripe, verifyWebhookSignature } from "@/lib/stripe"
import { prisma } from "@/lib/prisma"
import { PaymentStatus } from "@prisma/client"

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
        const invoiceId = session.metadata?.invoiceId

        if (!invoiceId) {
          console.warn("Checkout session completed without invoiceId metadata")
          break
        }

        // Update invoice status to PAID
        await prisma.invoice.update({
          where: { id: parseInt(invoiceId) },
          data: {
            paymentStatus: PaymentStatus.PAID,
            paidAt: new Date(),
          },
        })

        console.log(`Invoice ${invoiceId} marked as PAID`)
        break
      }

      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object
        const invoiceId = paymentIntent.metadata?.invoiceId

        if (!invoiceId) {
          console.warn("Payment intent succeeded without invoiceId metadata")
          break
        }

        // Update invoice status to PAID
        await prisma.invoice.update({
          where: { id: parseInt(invoiceId) },
          data: {
            paymentStatus: PaymentStatus.PAID,
            paidAt: new Date(),
          },
        })

        console.log(`Invoice ${invoiceId} marked as PAID via payment intent`)
        break
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object
        const invoiceId = paymentIntent.metadata?.invoiceId

        if (!invoiceId) {
          console.warn("Payment intent failed without invoiceId metadata")
          break
        }

        // Optionally mark invoice as OVERDUE or keep as UNPAID
        console.log(`Payment failed for invoice ${invoiceId}`)
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
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
