import { Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { sendSuccess } from "../../utils/apiResponse";
import * as service from "./shipment.service";
import { AuthedRequest } from "../../middleware/auth";
import { ApiError } from "../../utils/ApiError";

export const createShipment = catchAsync(async (req: AuthedRequest, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  const shipment = await service.createShipment(req.user.id, req.body);
  sendSuccess(res, shipment, "Shipment created successfully", 201);
});

export const listShipments = catchAsync(async (req: AuthedRequest, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  const result = await service.listShipments(req, req.user);
  sendSuccess(res, result, "Shipments fetched successfully");
});

export const searchShipments = catchAsync(async (req: AuthedRequest, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  const result = await service.searchShipments(req.query.q as string, req.user);
  sendSuccess(res, result, "Search results fetched successfully");
});

export const getShipment = catchAsync(async (req: AuthedRequest, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  const shipment = await service.getShipmentById(req.params.id, req.user);
  sendSuccess(res, shipment, "Shipment fetched successfully");
});

export const updateShipment = catchAsync(async (req: AuthedRequest, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  const shipment = await service.updateShipment(req.params.id, req.user, req.body);
  sendSuccess(res, shipment, "Shipment updated successfully");
});

export const assignCourier = catchAsync(async (req: AuthedRequest, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  const shipment = await service.assignCourier(req.params.id, req.body.courierId, req.user.id);
  sendSuccess(res, shipment, "Courier assigned successfully");
});

export const updateStatus = catchAsync(async (req: AuthedRequest, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  const shipment = await service.updateShipmentStatus(req.params.id, req.user, req.body.status, req.body.note);
  sendSuccess(res, shipment, "Shipment status updated successfully");
});

export const cancelShipment = catchAsync(async (req: AuthedRequest, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  const shipment = await service.cancelShipment(req.params.id, req.user);
  sendSuccess(res, shipment, "Shipment cancelled successfully");
});

export const deleteShipment = catchAsync(async (req: AuthedRequest, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  await service.softDeleteShipment(req.params.id, req.user);
  sendSuccess(res, {}, "Shipment deleted successfully");
});

export const myAssigned = catchAsync(async (req: AuthedRequest, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  const result = await service.getMyAssignedShipments(req.user.id, req);
  sendSuccess(res, result, "Assigned shipments fetched successfully");
});
