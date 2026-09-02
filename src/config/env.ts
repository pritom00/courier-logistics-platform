import dotenv from "dotenv";
dotenv.config();

function required(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (v === undefined) {
    // Don't crash at import time in dev tooling (e.g. `prisma generate`);
    // real usage paths validate again where it matters.
    return "";
  }
  return v;
}

export const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: parseInt(process.env.PORT || "5000", 10),
  DATABASE_URL: required("DATABASE_URL"),
  JWT_ACCESS_SECRET: required("JWT_ACCESS_SECRET", "dev_access_secret_change_me"),
  JWT_REFRESH_SECRET: required("JWT_REFRESH_SECRET", "dev_refresh_secret_change_me"),
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || "30d",
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || "",
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || "",
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || "",
  REDIS_URL: process.env.REDIS_URL || "",
  CORS_ORIGIN: process.env.CORS_ORIGIN || "*",
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || "admin@courierhub.com",
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || "Admin@12345",
};
