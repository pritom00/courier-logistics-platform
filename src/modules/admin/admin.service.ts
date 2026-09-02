import { prisma } from "../../config/prisma";
import { getPagination, buildMeta } from "../../utils/pagination";
import { Request } from "express";
import { cache } from "../../config/redis";

export async function getDashboardStats() {
  const cacheKey = "admin:dashboard-stats";
  const cached = await cache.get(cacheKey);
  if (cached) return { ...JSON.parse(cached), cached: true };

  const [totalUsers, totalShipments, byStatus, totalRevenue, activeCouriers] = await Promise.all([
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.shipment.count({ where: { deletedAt: null } }),
    prisma.shipment.groupBy({ by: ["status"], _count: { status: true }, where: { deletedAt: null } }),
    prisma.payment.aggregate({ _sum: { amount: true }, where: { status: "PAID" } }),
    prisma.user.count({ where: { role: "COURIER", isActive: true, deletedAt: null } }),
  ]);

  const stats = {
    totalUsers,
    totalShipments,
    activeCouriers,
    totalRevenue: totalRevenue._sum.amount || 0,
    shipmentsByStatus: byStatus.map((s: { status: string; _count: { status: number } }) => ({ status: s.status, count: s._count.status })),
  };

  // Cache for 60s - dashboard stats don't need to be real-time and this
  // query fans out across several tables.
  await cache.set(cacheKey, JSON.stringify(stats), 60);
  return { ...stats, cached: false };
}

export async function getAuditLogs(req: Request) {
  const { page, limit, skip } = getPagination(req);
  const { entityType } = req.query as { entityType?: string };
  const where: Record<string, unknown> = {};
  if (entityType) where.entityType = entityType;

  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { id: true, name: true, email: true } } },
    }),
    prisma.auditLog.count({ where }),
  ]);
  return { items, meta: buildMeta(total, page, limit) };
}
