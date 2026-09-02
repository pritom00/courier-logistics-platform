import Stripe from "stripe";
import { prisma } from "../../config/prisma";
import { ApiError } from "../../utils/ApiError";
import { env } from "../../config/env";
import { writeAuditLog } from "../../utils/audit";

// Stripe is used as the reference real-payment integration (test mode via
// the merchant's own STRIPE_SECRET_KEY). The same Payment model/flow works
// for bKash or SSLCommerz by swapping this service's provider calls -
// the shipment/payment status machine and webhook verification pattern
// stay identical.
const stripe = env.STRIPE_SECRET_KEY ? new Stripe(env.STRIPE_SECRET_KEY) : null;

export async function initiatePayment(userId: string, shipmentId: string) {
  if (!stripe) throw ApiError.badRequest("Payment gateway is not configured on this server (missing STRIPE_SECRET_KEY)");

  const shipment = await prisma.shipment.findFirst({ where: { id: shipmentId, deletedAt: null } });
  if (!shipment) throw ApiError.notFound("Shipment not found");
  if (shipment.customerId !== userId) throw ApiError.forbidden("You can only pay for your own shipment");

  const existing = await prisma.payment.findUnique({ where: { shipmentId } });
  if (existing && existing.status === "PAID") throw ApiError.conflict("This shipment has already been paid for");

  // Create (or reuse) a Stripe PaymentIntent for the shipment amount.
  const intent = await stripe.paymentIntents.create({
    amount: Math.round(shipment.price * 100), // cents
    currency: "usd",
    metadata: { shipmentId },
  });

  const payment = await prisma.payment.upsert({
    where: { shipmentId },
    update: { providerRef: intent.id, status: "PENDING", amount: shipment.price },
    create: {
      shipmentId,
      userId,
      amount: shipment.price,
      method: "STRIPE",
      status: "PENDING",
      providerRef: intent.id,
    },
  });

  return { payment, clientSecret: intent.client_secret };
}

// Handles Stripe webhook events (payment_intent.succeeded / .payment_failed).
// This is the source of truth for payment status - never trust the client
// to report success directly.
export async function handleStripeWebhook(rawBody: Buffer, signature: string) {
  if (!stripe) throw ApiError.badRequest("Payment gateway is not configured on this server");
  if (!env.STRIPE_WEBHOOK_SECRET) throw ApiError.badRequest("Webhook secret is not configured");

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    throw ApiError.badRequest("Invalid webhook signature");
  }

  if (event.type === "payment_intent.succeeded") {
    const intent = event.data.object as Stripe.PaymentIntent;
    const shipmentId = intent.metadata.shipmentId;
    if (shipmentId) {
      await prisma.payment.update({
        where: { shipmentId },
        data: { status: "PAID", providerRef: intent.id },
      });
      await writeAuditLog({ action: "PAYMENT_SUCCEEDED", entityType: "Payment", entityId: shipmentId });
    }
  }

  if (event.type === "payment_intent.payment_failed") {
    const intent = event.data.object as Stripe.PaymentIntent;
    const shipmentId = intent.metadata.shipmentId;
    if (shipmentId) {
      await prisma.payment.update({ where: { shipmentId }, data: { status: "FAILED" } });
      await writeAuditLog({ action: "PAYMENT_FAILED", entityType: "Payment", entityId: shipmentId });
    }
  }

  return { received: true };
}

export async function getPaymentById(id: string, requester: { id: string; role: string }) {
  const payment = await prisma.payment.findFirst({ where: { id } });
  if (!payment) throw ApiError.notFound("Payment not found");
  if (requester.role === "CUSTOMER" && payment.userId !== requester.id) throw ApiError.forbidden();
  return payment;
}
