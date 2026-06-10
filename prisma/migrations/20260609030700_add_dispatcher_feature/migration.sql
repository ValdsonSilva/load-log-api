/*
  Warnings:

  - A unique constraint covering the columns `[driverCode]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[dispatcherCode]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "UserType" AS ENUM ('COMPANY_DRIVER', 'INDEPENDENT_COMPANY_DRIVER', 'OWNER_OPERATOR', 'INDEPENDENT_DISPATCHER', 'COMPANY_DISPATCHER', 'CARRIER_ADMIN');

-- CreateEnum
CREATE TYPE "DispatcherDriverConnectionStatus" AS ENUM ('PENDING', 'ACTIVE', 'REJECTED', 'REVOKED', 'CANCELLED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "LoadOfferStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "FieldSourceActorType" AS ENUM ('DRIVER', 'DISPATCHER', 'ADMIN', 'OCR', 'SYSTEM');

-- AlterTable
ALTER TABLE "Load" ADD COLUMN     "dispatcherId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "dispatcherCode" TEXT,
ADD COLUMN     "driverCode" TEXT,
ADD COLUMN     "userType" "UserType";

-- CreateTable
CREATE TABLE "DispatcherProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyName" TEXT,
    "displayName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DispatcherProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DispatcherDriverConnection" (
    "id" TEXT NOT NULL,
    "dispatcherId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "invitedById" TEXT NOT NULL,
    "status" "DispatcherDriverConnectionStatus" NOT NULL DEFAULT 'PENDING',
    "acceptedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "blockedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DispatcherDriverConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoadOffer" (
    "id" TEXT NOT NULL,
    "dispatcherId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "loadId" TEXT,
    "status" "LoadOfferStatus" NOT NULL DEFAULT 'PENDING',
    "pickupFacilityName" TEXT,
    "pickupStreet1" TEXT,
    "pickupCity" TEXT,
    "pickupState" TEXT,
    "pickupPostalCode" TEXT,
    "pickupCountry" TEXT DEFAULT 'US',
    "deliveryFacilityName" TEXT,
    "deliveryStreet1" TEXT,
    "deliveryCity" TEXT,
    "deliveryState" TEXT,
    "deliveryPostalCode" TEXT,
    "deliveryCountry" TEXT DEFAULT 'US',
    "rateAmount" DECIMAL(65,30),
    "estimatedMiles" DOUBLE PRECISION,
    "scheduledPickupAt" TIMESTAMP(3),
    "scheduledDeliveryAt" TIMESTAMP(3),
    "brokerName" TEXT,
    "customerName" TEXT,
    "notes" TEXT,
    "acceptedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoadOffer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoadFieldSource" (
    "id" TEXT NOT NULL,
    "loadId" TEXT NOT NULL,
    "fieldName" TEXT NOT NULL,
    "sourceActorType" "FieldSourceActorType" NOT NULL,
    "sourceUserId" TEXT,
    "sourceContext" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoadFieldSource_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DispatcherProfile_userId_key" ON "DispatcherProfile"("userId");

-- CreateIndex
CREATE INDEX "DispatcherDriverConnection_dispatcherId_idx" ON "DispatcherDriverConnection"("dispatcherId");

-- CreateIndex
CREATE INDEX "DispatcherDriverConnection_driverId_idx" ON "DispatcherDriverConnection"("driverId");

-- CreateIndex
CREATE INDEX "DispatcherDriverConnection_status_idx" ON "DispatcherDriverConnection"("status");

-- CreateIndex
CREATE UNIQUE INDEX "DispatcherDriverConnection_dispatcherId_driverId_key" ON "DispatcherDriverConnection"("dispatcherId", "driverId");

-- CreateIndex
CREATE UNIQUE INDEX "LoadOffer_loadId_key" ON "LoadOffer"("loadId");

-- CreateIndex
CREATE INDEX "LoadOffer_dispatcherId_idx" ON "LoadOffer"("dispatcherId");

-- CreateIndex
CREATE INDEX "LoadOffer_driverId_idx" ON "LoadOffer"("driverId");

-- CreateIndex
CREATE INDEX "LoadOffer_status_idx" ON "LoadOffer"("status");

-- CreateIndex
CREATE INDEX "LoadOffer_createdAt_idx" ON "LoadOffer"("createdAt");

-- CreateIndex
CREATE INDEX "LoadFieldSource_loadId_idx" ON "LoadFieldSource"("loadId");

-- CreateIndex
CREATE INDEX "LoadFieldSource_sourceActorType_idx" ON "LoadFieldSource"("sourceActorType");

-- CreateIndex
CREATE INDEX "LoadFieldSource_sourceUserId_idx" ON "LoadFieldSource"("sourceUserId");

-- CreateIndex
CREATE UNIQUE INDEX "LoadFieldSource_loadId_fieldName_key" ON "LoadFieldSource"("loadId", "fieldName");

-- CreateIndex
CREATE UNIQUE INDEX "User_driverCode_key" ON "User"("driverCode");

-- CreateIndex
CREATE UNIQUE INDEX "User_dispatcherCode_key" ON "User"("dispatcherCode");

-- AddForeignKey
ALTER TABLE "Load" ADD CONSTRAINT "Load_dispatcherId_fkey" FOREIGN KEY ("dispatcherId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispatcherProfile" ADD CONSTRAINT "DispatcherProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispatcherDriverConnection" ADD CONSTRAINT "DispatcherDriverConnection_dispatcherId_fkey" FOREIGN KEY ("dispatcherId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispatcherDriverConnection" ADD CONSTRAINT "DispatcherDriverConnection_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispatcherDriverConnection" ADD CONSTRAINT "DispatcherDriverConnection_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoadOffer" ADD CONSTRAINT "LoadOffer_dispatcherId_fkey" FOREIGN KEY ("dispatcherId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoadOffer" ADD CONSTRAINT "LoadOffer_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoadOffer" ADD CONSTRAINT "LoadOffer_loadId_fkey" FOREIGN KEY ("loadId") REFERENCES "Load"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoadFieldSource" ADD CONSTRAINT "LoadFieldSource_loadId_fkey" FOREIGN KEY ("loadId") REFERENCES "Load"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoadFieldSource" ADD CONSTRAINT "LoadFieldSource_sourceUserId_fkey" FOREIGN KEY ("sourceUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
