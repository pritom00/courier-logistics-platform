import { Router } from "express";
import * as controller from "./auth.controller";
import { validate } from "../../middleware/validate";
import { registerSchema, loginSchema, refreshTokenSchema, googleLoginSchema } from "./auth.validation";
import { authenticate } from "../../middleware/auth";
import { authLimiter } from "../../middleware/rateLimiter";

const router = Router();

router.post("/register", authLimiter, validate(registerSchema), controller.register);
router.post("/login", authLimiter, validate(loginSchema), controller.login);
router.post("/google", authLimiter, validate(googleLoginSchema), controller.googleLogin);
router.post("/refresh-token", validate(refreshTokenSchema), controller.refresh);
router.post("/logout", authenticate, controller.logout);

export default router;
