import { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/ApiError";
import { sendError } from "../utils/apiResponse";

// Centralized error-handling middleware. Every thrown/forwarded error in the
// app funnels through here so every failure mode returns the same JSON shape.
export function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction) {
  if (err instanceof ApiError) {
    return sendError(res, err.message, err.statusCode, err.errors);
  }

  // Prisma known request errors (unique constraint, FK violation, etc.)
  const prismaErr = err as { code?: string; meta?: Record<string, unknown> };
  if (prismaErr?.code === "P2002") {
    return sendError(res, "A record with this value already exists", 409, [prismaErr.meta ?? {}]);
  }
  if (prismaErr?.code === "P2025") {
    return sendError(res, "Record not found", 404);
  }

  console.error("Unhandled error:", err);
  return sendError(res, "Internal server error", 500);
}

export function notFoundHandler(req: Request, res: Response) {
  return sendError(res, `Route ${req.method} ${req.originalUrl} not found`, 404);
}
