-- CreateEnum
CREATE TYPE "Role" AS ENUM ('CUSTOMER', 'COURIER', 'ADMIN');
CREATE TYPE "AuthProvider" AS ENUM ('CREDENTIALS', 'GOOGLE');
CREATE TYPE "ShipmentStatus" AS ENUM ('PENDING','PICKUP_SCHEDULED','COURIER_ASSIGNED','PICKED_UP','AT_ORIGIN_HUB','IN_TRANSIT','AT_DESTINATION_HUB','OUT_FOR_DELIVERY','DELIVERED','FAILED_DELIVERY','RETURNED','CANCELLED');
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING','PAID','FAILED','REFUNDED');
CREATE TYPE "PaymentMethod" AS ENUM ('STRIPE','BKASH','SSLCOMMERZ');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT,
    "phone" TEXT,
    "role" "Role" NOT NULL DEFAULT 'CUSTOMER',
    "provider" "AuthProvider" NOT NULL DEFAULT 'CREDENTIALS',
    "googleId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "refreshToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "users_googleId_key" ON "users"("googleId");
CREATE INDEX "users_email_idx" ON "users"("email");
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateTable
CREATE TABLE "hubs" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "managerId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "hubs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "hubs_city_idx" ON "hubs"("city");

-- CreateTable
CREATE TABLE "shipments" (
    "id" TEXT NOT NULL,
    "trackingCode" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "courierId" TEXT,
    "originHubId" TEXT,
    "destinationHubId" TEXT,
    "pickupAddress" TEXT NOT NULL,
    "deliveryAddress" TEXT NOT NULL,
    "receiverName" TEXT NOT NULL,
    "receiverPhone" TEXT NOT NULL,
    "packageWeightKg" DOUBLE PRECISION NOT NULL,
    "packageDesc" TEXT,
    "status" "ShipmentStatus" NOT NULL DEFAULT 'PENDING',
    "price" DOUBLE PRECISION NOT NULL,
    "isFragile" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "shipments_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "shipments_trackingCode_key" ON "shipments"("trackingCode");
CREATE INDEX "shipments_customerId_idx" ON "shipments"("customerId");
CREATE INDEX "shipments_courierId_idx" ON "shipments"("courierId");
CREATE INDEX "shipments_status_idx" ON "shipments"("status");
CREATE INDEX "shipments_createdAt_idx" ON "shipments"("createdAt");

-- CreateTable
CREATE TABLE "tracking_events" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "status" "ShipmentStatus" NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "tracking_events_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "tracking_events_shipmentId_idx" ON "tracking_events"("shipmentId");

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "method" "PaymentMethod" NOT NULL DEFAULT 'STRIPE',
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "providerRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "payments_shipmentId_key" ON "payments"("shipmentId");
CREATE INDEX "payments_userId_idx" ON "payments"("userId");
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- AddForeignKey
ALTER TABLE "hubs" ADD CONSTRAINT "hubs_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_courierId_fkey" FOREIGN KEY ("courierId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_originHubId_fkey" FOREIGN KEY ("originHubId") REFERENCES "hubs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_destinationHubId_fkey" FOREIGN KEY ("destinationHubId") REFERENCES "hubs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "tracking_events" ADD CONSTRAINT "tracking_events_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "shipments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "shipments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
