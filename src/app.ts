import express, { Express, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env";
import { globalLimiter } from "./middleware/rateLimiter";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { sendSuccess } from "./utils/apiResponse";

import authRoutes from "./modules/auth/auth.routes";
import userRoutes from "./modules/user/user.routes";
import hubRoutes from "./modules/hub/hub.routes";
import shipmentRoutes from "./modules/shipment/shipment.routes";
import paymentRoutes from "./modules/payment/payment.routes";
import adminRoutes from "./modules/admin/admin.routes";
import { stripeWebhook } from "./modules/payment/payment.controller";

const app: Express = express();

app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(morgan(env.NODE_ENV === "development" ? "dev" : "combined"));
app.use(globalLimiter);

// Stripe webhook needs the RAW body for signature verification, so it must
// be registered BEFORE express.json() and is excluded from JSON parsing.
app.post("/api/v1/payments/webhook", express.raw({ type: "application/json" }), stripeWebhook);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req: Request, res: Response) => {
  sendSuccess(res, { name: "Courier & Logistics Management Platform API", version: "v1" }, "Service is healthy");
});
app.get("/health", (req: Request, res: Response) => sendSuccess(res, { uptime: process.uptime() }, "OK"));

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/hubs", hubRoutes);
app.use("/api/v1/shipments", shipmentRoutes);
app.use("/api/v1/payments", paymentRoutes);
app.use("/api/v1/admin", adminRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
