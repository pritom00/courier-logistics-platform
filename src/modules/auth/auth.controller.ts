import { Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { sendSuccess } from "../../utils/apiResponse";
import * as authService from "./auth.service";
import { AuthedRequest } from "../../middleware/auth";
import { ApiError } from "../../utils/ApiError";

export const register = catchAsync(async (req, res) => {
  const result = await authService.registerUser(req.body);
  sendSuccess(res, result, "User registered successfully", 201);
});

export const login = catchAsync(async (req, res) => {
  const { email, password } = req.body;
  const result = await authService.loginUser(email, password);
  sendSuccess(res, result, "Login successful");
});

export const googleLogin = catchAsync(async (req, res) => {
  const result = await authService.loginWithGoogle(req.body.idToken);
  sendSuccess(res, result, "Google login successful");
});

export const refresh = catchAsync(async (req, res) => {
  const result = await authService.refreshAccessToken(req.body.refreshToken);
  sendSuccess(res, result, "Access token refreshed");
});

export const logout = catchAsync(async (req: AuthedRequest, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  await authService.logoutUser(req.user.id);
  sendSuccess(res, {}, "Logged out successfully");
});
