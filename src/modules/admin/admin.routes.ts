import { Router } from "express";
import * as controller from "./admin.controller";
import { authenticate, authorize } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { updateRoleSchema, listUsersQuerySchema } from "../user/user.validation";

const router = Router();

router.use(authenticate, authorize("ADMIN"));
router.get("/dashboard-stats", controller.dashboardStats);
router.get("/audit-logs", controller.auditLogs);
router.get("/users", validate(listUsersQuerySchema), controller.listUsers);
router.patch("/users/:id/role", validate(updateRoleSchema), controller.updateUserRole);

export default router;
