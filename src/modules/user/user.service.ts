import { prisma } from "../../config/prisma";
import { ApiError } from "../../utils/ApiError";
import { getPagination, buildMeta } from "../../utils/pagination";
import { Request } from "express";
import { writeAuditLog } from "../../utils/audit";

function sanitize<T extends { password?: string | null }>(u: T) {
  const { password, ...rest } = u;
  return rest;
}

export async function getMe(userId: string) {
  const user = await prisma.user.findFirst({ where: { id: userId, deletedAt: null } });
  if (!user) throw ApiError.notFound("User not found");
  return sanitize(user);
}

export async function updateMe(userId: string, data: { name?: string; phone?: string }) {
  const user = await prisma.user.update({ where: { id: userId }, data });
  return sanitize(user);
}

export async function listUsers(req: Request) {
  const { page, limit, skip } = getPagination(req);
  const { role, q } = req.query as { role?: string; q?: string };

  const where: Record<string, unknown> = { deletedAt: null };
  if (role) where.role = role;
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, email: true, role: true, phone: true, isActive: true, createdAt: true },
    }),
    prisma.user.count({ where }),
  ]);

  return { items, meta: buildMeta(total, page, limit) };
}

export async function updateUserRole(adminId: string, targetUserId: string, role: "CUSTOMER" | "COURIER" | "ADMIN") {
  const target = await prisma.user.findFirst({ where: { id: targetUserId, deletedAt: null } });
  if (!target) throw ApiError.notFound("User not found");

  const updated = await prisma.user.update({ where: { id: targetUserId }, data: { role } });
  await writeAuditLog({
    userId: adminId,
    action: "ROLE_UPDATED",
    entityType: "User",
    entityId: targetUserId,
    metadata: { previousRole: target.role, newRole: role },
  });
  return sanitize(updated);
}
