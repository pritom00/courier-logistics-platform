import { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/ApiError";
import { verifyAccessToken } from "../utils/jwt";
import { prisma } from "../config/prisma";

export interface AuthedRequest extends Request {
  user?: { id: string; role: "CUSTOMER" | "COURIER" | "ADMIN"; email: string };
}

// Bearer-token authentication middleware, required on every protected route.
export const authenticate = async (req: AuthedRequest, res: Response, next: NextFunction) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
      throw ApiError.unauthorized("Missing or malformed Authorization header");
    }
    const token = header.split(" ")[1];
    const decoded = verifyAccessToken(token);

    const user = await prisma.user.findFirst({
      where: { id: decoded.userId, deletedAt: null, isActive: true },
      select: { id: true, role: true, email: true },
    });
    if (!user) throw ApiError.unauthorized("Invalid token or user no longer exists");

    req.user = user;
    next();
  } catch (err) {
    next(ApiError.unauthorized("Invalid or expired access token"));
  }
};

// Strict role-based authorization middleware factory.
// Usage: authorize("ADMIN", "COURIER")
export const authorize =
  (...allowedRoles: Array<"CUSTOMER" | "COURIER" | "ADMIN">) =>
  (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!allowedRoles.includes(req.user.role)) {
      return next(ApiError.forbidden(`Role '${req.user.role}' is not permitted to perform this action`));
    }
    next();
  };
