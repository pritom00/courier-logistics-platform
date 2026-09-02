import { z } from "zod";

export const updateMeSchema = z.object({
  body: z.object({
    name: z.string().min(2).optional(),
    phone: z.string().optional(),
  }),
});

export const updateRoleSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({ role: z.enum(["CUSTOMER", "COURIER", "ADMIN"]) }),
});

export const listUsersQuerySchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    role: z.enum(["CUSTOMER", "COURIER", "ADMIN"]).optional(),
    q: z.string().optional(),
  }),
});
