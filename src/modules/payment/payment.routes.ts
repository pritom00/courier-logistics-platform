import { Router } from "express";
import * as controller from "./payment.controller";
import { authenticate } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { initiatePaymentSchema, idParamSchema } from "./payment.validation";

const router = Router();

// Webhook route is mounted separately in app.ts with raw body parsing,
// BEFORE the global express.json() middleware, and is intentionally not
// behind `authenticate` (Stripe calls it directly, verified via signature).

router.use(authenticate);
router.post("/initiate", validate(initiatePaymentSchema), controller.initiatePayment);
router.get("/:id", validate(idParamSchema), controller.getPayment);

export default router;
