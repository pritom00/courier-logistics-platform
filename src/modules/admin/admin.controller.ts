import { catchAsync } from "../../utils/catchAsync";
import { sendSuccess } from "../../utils/apiResponse";
import * as service from "./admin.service";
import * as userService from "../user/user.service";
import { AuthedRequest } from "../../middleware/auth";
import { ApiError } from "../../utils/ApiError";

export const dashboardStats = catchAsync(async (req, res) => {
  const stats = await service.getDashboardStats();
  sendSuccess(res, stats, "Dashboard stats fetched successfully");
});

export const auditLogs = catchAsync(async (req, res) => {
  const result = await service.getAuditLogs(req);
  sendSuccess(res, result, "Audit logs fetched successfully");
});

export const listUsers = catchAsync(async (req, res) => {
  const result = await userService.listUsers(req);
  sendSuccess(res, result, "Users fetched successfully");
});

export const updateUserRole = catchAsync(async (req: AuthedRequest, res) => {
  if (!req.user) throw ApiError.unauthorized();
  const user = await userService.updateUserRole(req.user.id, req.params.id, req.body.role);
  sendSuccess(res, user, "User role updated successfully");
});
