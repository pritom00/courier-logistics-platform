import { Router } from "express";
import * as controller from "./user.controller";
import { authenticate, authorize } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { updateMeSchema } from "./user.validation";

const router = Router();

router.use(authenticate);
router.get("/me", controller.getMe);
router.patch("/me", validate(updateMeSchema), controller.updateMe);

export default router;
