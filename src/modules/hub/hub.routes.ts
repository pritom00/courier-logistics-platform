import { Router } from "express";
import * as controller from "./hub.controller";
import { authenticate, authorize } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { createHubSchema, updateHubSchema, idParamSchema } from "./hub.validation";

const router = Router();

router.use(authenticate);
router.get("/", controller.listHubs);
router.get("/:id", validate(idParamSchema), controller.getHub);
router.post("/", authorize("ADMIN"), validate(createHubSchema), controller.createHub);
router.patch("/:id", authorize("ADMIN"), validate(updateHubSchema), controller.updateHub);
router.delete("/:id", authorize("ADMIN"), validate(idParamSchema), controller.deleteHub);

export default router;
