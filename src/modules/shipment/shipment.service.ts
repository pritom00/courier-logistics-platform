import { Request } from "express";
import { randomBytes } from "crypto";
import { prisma } from "../../config/prisma";
import { ApiError } from "../../utils/ApiError";
import { getPagination, buildMeta } from "../../utils/pagination";
import { calculatePrice } from "./shipment.pricing";
import { assertValidTransition } from "./shipment.stateMachine";
import { writeAuditLog } from "../../utils/audit";
import { cache } from "../../config/redis";

function generateTrackingCode() {
  return `CRX-${Date.now().toString(36).toUpperCase()}-${randomBytes(3).toString("hex").toUpperCase()}`;
}

export async function createShipment(customerId: string, input: {
  pickupAddress: string;
  deliveryAddress: string;
  receiverName: string;
  receiverPhone: string;
  packageWeightKg: number;
  packageDesc?: string;
  isFragile?: boolean;
  originHubId?: string;
  destinationHubId?: string;
}) {
  const price = calculatePrice(input.packageWeightKg, input.isFragile);

  // Transaction: create the shipment + its first tracking event atomically.
  const shipment = await prisma.$transaction(async (tx: any) => {
    const created = await tx.shipment.create({
      data: {
        ...input,
        customerId,
        price,
        trackingCode: generateTrackingCode(),
        status: "PENDING",
      },
    });
    await tx.trackingEvent.create({
      data: { shipmentId: created.id, status: "PENDING", note: "Shipment created" },
    });
    return created;
  });

  await writeAuditLog({ userId: customerId, action: "SHIPMENT_CREATED", entityType: "Shipment", entityId: shipment.id });
  return shipment;
}

export async function listShipments(req: Request, requester: { id: string; role: string }) {
  const { page, limit, skip } = getPagination(req);
  const { status, sortBy, sortOrder } = req.query as { status?: string; sortBy?: string; sortOrder?: "asc" | "desc" };

  const where: Record<string, unknown> = { deletedAt: null };
  if (status) where.status = status;

  // Customers only see their own shipments; couriers see assigned ones;
  // admins see everything.
  if (requester.role === "CUSTOMER") where.customerId = requester.id;
  if (requester.role === "COURIER") where.courierId = requester.id;

  const allowedSort = ["createdAt", "price", "status"];
  const orderField = allowedSort.includes(sortBy || "") ? (sortBy as string) : "createdAt";

  const [items, total] = await Promise.all([
    prisma.shipment.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [orderField]: sortOrder || "desc" },
      include: { customer: { select: { id: true, name: true } }, courier: { select: { id: true, name: true } } },
    }),
    prisma.shipment.count({ where }),
  ]);

  return { items, meta: buildMeta(total, page, limit) };
}

export async function searchShipments(q: string, requester: { id: string; role: string }) {
  const where: Record<string, unknown> = {
    deletedAt: null,
    OR: [
      { trackingCode: { contains: q, mode: "insensitive" } },
      { receiverName: { contains: q, mode: "insensitive" } },
      { pickupAddress: { contains: q, mode: "insensitive" } },
      { deliveryAddress: { contains: q, mode: "insensitive" } },
    ],
  };
  if (requester.role === "CUSTOMER") where.customerId = requester.id;
  if (requester.role === "COURIER") where.courierId = requester.id;

  return prisma.shipment.findMany({ where, take: 25, orderBy: { createdAt: "desc" } });
}

export async function getShipmentById(id: string, requester: { id: string; role: string }) {
  const shipment = await prisma.shipment.findFirst({
    where: { id, deletedAt: null },
    include: { trackingEvents: { orderBy: { createdAt: "asc" } }, payment: true },
  });
  if (!shipment) throw ApiError.notFound("Shipment not found");

  if (requester.role === "CUSTOMER" && shipment.customerId !== requester.id) throw ApiError.forbidden();
  if (requester.role === "COURIER" && shipment.courierId !== requester.id) throw ApiError.forbidden();

  return shipment;
}

export async function updateShipment(id: string, requester: { id: string; role: string }, data: Record<string, unknown>) {
  const shipment = await getShipmentById(id, requester);
  if (["DELIVERED", "CANCELLED", "RETURNED"].includes(shipment.status)) {
    throw ApiError.badRequest("Cannot edit a shipment that is already finalized");
  }
  return prisma.shipment.update({ where: { id }, data });
}

// Assigns a courier to a shipment. Wrapped in a transaction with a row lock
// pattern (re-check inside the transaction) to prevent two admins from
// double-assigning the same shipment concurrently (race condition).
export async function assignCourier(shipmentId: string, courierId: string, adminId: string) {
  const courier = await prisma.user.findFirst({ where: { id: courierId, role: "COURIER", deletedAt: null, isActive: true } });
  if (!courier) throw ApiError.badRequest("Selected courier does not exist or is not an active courier");

  const result = await prisma.$transaction(async (tx: any) => {
    const shipment = await tx.shipment.findFirst({ where: { id: shipmentId, deletedAt: null } });
    if (!shipment) throw ApiError.notFound("Shipment not found");
    if (shipment.courierId) throw ApiError.conflict("This shipment already has a courier assigned");
    if (!["PENDING", "PICKUP_SCHEDULED"].includes(shipment.status)) {
      throw ApiError.badRequest(`Cannot assign a courier while shipment is in status '${shipment.status}'`);
    }

    const updated = await tx.shipment.update({
      where: { id: shipmentId },
      data: { courierId, status: "COURIER_ASSIGNED" },
    });
    await tx.trackingEvent.create({
      data: { shipmentId, status: "COURIER_ASSIGNED", note: `Courier ${courier.name} assigned` },
    });
    return updated;
  });

  await writeAuditLog({
    userId: adminId,
    action: "COURIER_ASSIGNED",
    entityType: "Shipment",
    entityId: shipmentId,
    metadata: { courierId },
  });
  await cache.del("admin:dashboard-stats");
  return result;
}

export async function updateShipmentStatus(
  shipmentId: string,
  requester: { id: string; role: string },
  status: string,
  note?: string
) {
  const result = await prisma.$transaction(async (tx: any) => {
    const shipment = await tx.shipment.findFirst({ where: { id: shipmentId, deletedAt: null } });
    if (!shipment) throw ApiError.notFound("Shipment not found");

    if (requester.role === "COURIER" && shipment.courierId !== requester.id) {
      throw ApiError.forbidden("You are not the assigned courier for this shipment");
    }

    assertValidTransition(shipment.status, status);

    const updated = await tx.shipment.update({ where: { id: shipmentId }, data: { status } });
    await tx.trackingEvent.create({ data: { shipmentId, status: status as never, note } });
    return updated;
  });

  await writeAuditLog({
    userId: requester.id,
    action: "SHIPMENT_STATUS_CHANGED",
    entityType: "Shipment",
    entityId: shipmentId,
    metadata: { newStatus: status, note },
  });
  await cache.del("admin:dashboard-stats");
  return result;
}

export async function cancelShipment(shipmentId: string, requester: { id: string; role: string }) {
  const shipment = await getShipmentById(shipmentId, requester);
  if (["DELIVERED", "CANCELLED", "RETURNED"].includes(shipment.status)) {
    throw ApiError.badRequest(`Shipment in status '${shipment.status}' cannot be cancelled`);
  }
  return updateShipmentStatus(shipmentId, requester, "CANCELLED", "Cancelled by user request");
}

export async function softDeleteShipment(shipmentId: string, requester: { id: string; role: string }) {
  const shipment = await getShipmentById(shipmentId, requester);
  await prisma.shipment.update({ where: { id: shipment.id }, data: { deletedAt: new Date() } });
  await writeAuditLog({ userId: requester.id, action: "SHIPMENT_SOFT_DELETED", entityType: "Shipment", entityId: shipment.id });
}

export async function getMyAssignedShipments(courierId: string, req: Request) {
  const { page, limit, skip } = getPagination(req);
  const where = { courierId, deletedAt: null };
  const [items, total] = await Promise.all([
    prisma.shipment.findMany({ where, skip, take: limit, orderBy: { createdAt: "desc" } }),
    prisma.shipment.count({ where }),
  ]);
  return { items, meta: buildMeta(total, page, limit) };
}
