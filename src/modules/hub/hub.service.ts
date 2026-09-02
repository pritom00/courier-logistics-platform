import { prisma } from "../../config/prisma";
import { ApiError } from "../../utils/ApiError";
import { getPagination, buildMeta } from "../../utils/pagination";
import { Request } from "express";

export async function createHub(data: { name: string; city: string; address: string; managerId?: string }) {
  return prisma.hub.create({ data });
}

export async function listHubs(req: Request) {
  const { page, limit, skip } = getPagination(req);
  const { city } = req.query as { city?: string };
  const where: Record<string, unknown> = { deletedAt: null };
  if (city) where.city = { equals: city, mode: "insensitive" };

  const [items, total] = await Promise.all([
    prisma.hub.findMany({ where, skip, take: limit, orderBy: { createdAt: "desc" } }),
    prisma.hub.count({ where }),
  ]);
  return { items, meta: buildMeta(total, page, limit) };
}

export async function getHubById(id: string) {
  const hub = await prisma.hub.findFirst({ where: { id, deletedAt: null } });
  if (!hub) throw ApiError.notFound("Hub not found");
  return hub;
}

export async function updateHub(id: string, data: Record<string, unknown>) {
  await getHubById(id);
  return prisma.hub.update({ where: { id }, data });
}

export async function softDeleteHub(id: string) {
  await getHubById(id);
  return prisma.hub.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });
}
