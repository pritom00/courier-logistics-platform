import { Request } from "express";

export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

export function getPagination(req: Request): PaginationParams {
  const page = Math.max(parseInt((req.query.page as string) || "1", 10), 1);
  const limit = Math.min(Math.max(parseInt((req.query.limit as string) || "10", 10), 1), 100);
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

export function buildMeta(total: number, page: number, limit: number) {
  return { total, page, limit, totalPages: Math.ceil(total / limit) || 1 };
}
