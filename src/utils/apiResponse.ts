import { Response } from "express";

// Every endpoint MUST respond using these helpers so the JSON shape is
// consistent across the whole API:
//   Success: { success: true, message, data }
//   Error:   { success: false, message, errors }

export function sendSuccess(
  res: Response,
  data: unknown = {},
  message = "Operation successful",
  statusCode = 200
) {
  return res.status(statusCode).json({ success: true, message, data });
}

export function sendError(
  res: Response,
  message = "Something went wrong",
  statusCode = 400,
  errors: unknown[] = []
) {
  return res.status(statusCode).json({ success: false, message, errors });
}
