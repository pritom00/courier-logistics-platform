import { ApiError } from "../../utils/ApiError";

// Defines which status transitions are legal, preventing e.g. jumping
// straight from PENDING to DELIVERED, or updating a CANCELLED shipment.
const TRANSITIONS: Record<string, string[]> = {
  PENDING: ["PICKUP_SCHEDULED", "CANCELLED"],
  PICKUP_SCHEDULED: ["COURIER_ASSIGNED", "CANCELLED"],
  COURIER_ASSIGNED: ["PICKED_UP", "CANCELLED"],
  PICKED_UP: ["AT_ORIGIN_HUB", "CANCELLED"],
  AT_ORIGIN_HUB: ["IN_TRANSIT"],
  IN_TRANSIT: ["AT_DESTINATION_HUB"],
  AT_DESTINATION_HUB: ["OUT_FOR_DELIVERY"],
  OUT_FOR_DELIVERY: ["DELIVERED", "FAILED_DELIVERY"],
  FAILED_DELIVERY: ["OUT_FOR_DELIVERY", "RETURNED"],
  DELIVERED: [],
  RETURNED: [],
  CANCELLED: [],
};

export function assertValidTransition(current: string, next: string) {
  if (current === next) return; // idempotent no-op update is allowed
  const allowed = TRANSITIONS[current] || [];
  if (!allowed.includes(next)) {
    throw ApiError.badRequest(
      `Invalid status transition: cannot move shipment from '${current}' to '${next}'`
    );
  }
}
