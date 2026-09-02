import { z } from "zod";

export const createHubSchema = z.object({
  body: z.object({
    name: z.string().min(2),
    city: z.string().min(2),
    address: z.string().min(3),
    managerId: z.string().uuid().optional(),
  }),
});

export const updateHubSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    name: z.string().min(2).optional(),
    city: z.string().min(2).optional(),
    address: z.string().min(3).optional(),
    managerId: z.string().uuid().optional(),
    isActive: z.boolean().optional(),
  }),
});

export const idParamSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
});
