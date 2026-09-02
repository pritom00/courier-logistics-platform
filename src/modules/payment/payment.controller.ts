import { Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { sendSuccess } from "../../utils/apiResponse";
import * as service from "./payment.service";
import { AuthedRequest } from "../../middleware/auth";
import { ApiError } from "../../utils/ApiError";

export const initiatePayment = catchAsync(async (req: AuthedRequest, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  const result = await service.initiatePayment(req.user.id, req.body.shipmentId);
  sendSuccess(res, result, "Payment initiated successfully", 201);
});

// NOTE: mounted with express.raw() body parsing (see app.ts) because Stripe
// requires the exact raw request body to verify the webhook signature.
export const stripeWebhook = catchAsync(async (req, res) => {
  const signature = req.headers["stripe-signature"] as string;
  const result = await service.handleStripeWebhook(req.body, signature);
  sendSuccess(res, result, "Webhook processed");
});

export const getPayment = catchAsync(async (req: AuthedRequest, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  const payment = await service.getPaymentById(req.params.id, req.user);
  sendSuccess(res, payment, "Payment fetched successfully");
});
