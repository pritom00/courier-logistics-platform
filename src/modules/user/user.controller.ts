import { Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { sendSuccess } from "../../utils/apiResponse";
import * as service from "./user.service";
import { AuthedRequest } from "../../middleware/auth";
import { ApiError } from "../../utils/ApiError";

export const getMe = catchAsync(async (req: AuthedRequest, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  const user = await service.getMe(req.user.id);
  sendSuccess(res, user, "Profile fetched successfully");
});

export const updateMe = catchAsync(async (req: AuthedRequest, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  const user = await service.updateMe(req.user.id, req.body);
  sendSuccess(res, user, "Profile updated successfully");
});

export const listUsers = catchAsync(async (req, res) => {
  const result = await service.listUsers(req);
  sendSuccess(res, result, "Users fetched successfully");
});

export const updateUserRole = catchAsync(async (req: AuthedRequest, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  const user = await service.updateUserRole(req.user.id, req.params.id, req.body.role);
  sendSuccess(res, user, "User role updated successfully");
});
