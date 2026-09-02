import { catchAsync } from "../../utils/catchAsync";
import { sendSuccess } from "../../utils/apiResponse";
import * as service from "./hub.service";

export const createHub = catchAsync(async (req, res) => {
  const hub = await service.createHub(req.body);
  sendSuccess(res, hub, "Hub created successfully", 201);
});

export const listHubs = catchAsync(async (req, res) => {
  const result = await service.listHubs(req);
  sendSuccess(res, result, "Hubs fetched successfully");
});

export const getHub = catchAsync(async (req, res) => {
  const hub = await service.getHubById(req.params.id);
  sendSuccess(res, hub, "Hub fetched successfully");
});

export const updateHub = catchAsync(async (req, res) => {
  const hub = await service.updateHub(req.params.id, req.body);
  sendSuccess(res, hub, "Hub updated successfully");
});

export const deleteHub = catchAsync(async (req, res) => {
  await service.softDeleteHub(req.params.id);
  sendSuccess(res, {}, "Hub deleted successfully");
});
