import { z } from "zod";

export const createShipmentSchema = z.object({
  body: z.object({
    pickupAddress: z.string().min(3),
    deliveryAddress: z.string().min(3),
    receiverName: z.string().min(2),
    receiverPhone: z.string().min(6),
    packageWeightKg: z.number().positive(),
    packageDesc: z.string().optional(),
    isFragile: z.boolean().optional(),
    originHubId: z.string().uuid().optional(),
    destinationHubId: z.string().uuid().optional(),
  }),
});

export const updateShipmentSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    pickupAddress: z.string().min(3).optional(),
    deliveryAddress: z.string().min(3).optional(),
    receiverName: z.string().min(2).optional(),
    receiverPhone: z.string().min(6).optional(),
    packageDesc: z.string().optional(),
  }),
});

export const assignCourierSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({ courierId: z.string().uuid() }),
});

export const updateStatusSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    status: z.enum([
      "PENDING",
      "PICKUP_SCHEDULED",
      "COURIER_ASSIGNED",
      "PICKED_UP",
      "AT_ORIGIN_HUB",
      "IN_TRANSIT",
      "AT_DESTINATION_HUB",
      "OUT_FOR_DELIVERY",
      "DELIVERED",
      "FAILED_DELIVERY",
      "RETURNED",
      "CANCELLED",
    ]),
    note: z.string().optional(),
  }),
});

export const idParamSchema = z.object({ params: z.object({ id: z.string().uuid() }) });

export const listShipmentsQuerySchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    status: z.string().optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(["asc", "desc"]).optional(),
  }),
});

export const searchShipmentsQuerySchema = z.object({
  query: z.object({ q: z.string().min(1, "Search query 'q' is required") }),
});
