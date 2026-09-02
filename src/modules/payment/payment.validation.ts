import { z } from "zod";

export const initiatePaymentSchema = z.object({
  body: z.object({
    shipmentId: z.string().uuid(),
  }),
});

export const idParamSchema = z.object({ params: z.object({ id: z.string().uuid() }) });
