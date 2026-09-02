import { Router } from "express";
import * as controller from "./shipment.controller";
import { authenticate, authorize } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import {
  createShipmentSchema,
  updateShipmentSchema,
  assignCourierSchema,
  updateStatusSchema,
  idParamSchema,
} from "./shipment.validation";

const router = Router();

router.use(authenticate);

// Order matters: static/specific paths before dynamic ':id' path.
router.get("/search", controller.searchShipments);
router.get("/my-assigned", authorize("COURIER"), controller.myAssigned);

router.post("/", authorize("CUSTOMER"), validate(createShipmentSchema), controller.createShipment);
router.get("/", controller.listShipments);
router.get("/:id", validate(idParamSchema), controller.getShipment);
router.patch("/:id", validate(updateShipmentSchema), controller.updateShipment);
router.delete("/:id", authorize("ADMIN"), validate(idParamSchema), controller.deleteShipment);

router.post("/:id/assign", authorize("ADMIN"), validate(assignCourierSchema), controller.assignCourier);
router.patch("/:id/status", authorize("ADMIN", "COURIER"), validate(updateStatusSchema), controller.updateStatus);
router.post("/:id/cancel", validate(idParamSchema), controller.cancelShipment);

export default router;
