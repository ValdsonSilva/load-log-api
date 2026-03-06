-- CreateEnum
CREATE TYPE "LoadType" AS ENUM ('DRY_VAN', 'REEFER', 'FLATBED', 'STEPDECK', 'POWER_ONLY', 'OTHER');

-- CreateEnum
CREATE TYPE "LoadMode" AS ENUM ('LIVE_LIVE', 'LIVE_DROP', 'DROP_LIVE', 'DROP_DROP');

-- CreateEnum
CREATE TYPE "LoadStatus" AS ENUM ('PRE_TRIP', 'DRIVING', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DriverOperatingAs" AS ENUM ('OWNER_OPERATOR_OWN_AUTHORITY', 'COMPANY_DRIVER_UNDER_AUTHORITY', 'LEASED_ON_UNDER_COMPANY_AUTHORITY');

-- CreateEnum
CREATE TYPE "StopType" AS ENUM ('PICKUP', 'DELIVERY', 'STOP_OFF');

-- CreateEnum
CREATE TYPE "AppointmentType" AS ENUM ('FCFS', 'APPOINTMENT_REQUIRED', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "HandlingType" AS ENUM ('LIVE_LOAD', 'LIVE_UNLOAD', 'DROP_HOOK', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "RateType" AS ENUM ('FLAT', 'PER_MILE', 'OTHER');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('FACTORING', 'QUICK_PAY', 'STANDARD');

-- CreateEnum
CREATE TYPE "TrackingProvider" AS ENUM ('MACROPOINT', 'PROJECT44', 'OTHER');

-- CreateEnum
CREATE TYPE "AccessorialType" AS ENUM ('DRIVER_ASSIST', 'HAZMAT', 'REEFER_FUEL', 'TARP', 'STOP_OFF', 'OTHER');

-- CreateEnum
CREATE TYPE "AttachmentType" AS ENUM ('RATE_CONFIRMATION', 'BOL_PHOTO', 'POD', 'SIGNED_BOL', 'LUMPER_RECEIPT', 'SCALE_TICKET', 'FUEL_RECEIPT', 'OTHER');

-- CreateEnum
CREATE TYPE "TimelineEventType" AS ENUM ('ARRIVED_AT_SHIPPER', 'CHECKED_IN', 'DOOR_ASSIGNED', 'LOAD_START', 'LOAD_END', 'LEFT_SHIPPER', 'SCALE_STOP', 'ARRIVED_AT_RECEIVER', 'UNLOAD_START', 'UNLOAD_END', 'LEFT_RECEIVER', 'LOAD_COMPLETED', 'DELAY_TRAFFIC', 'DELAY_WEATHER', 'DELAY_ACCIDENT', 'NOTE', 'OTHER');

-- CreateEnum
CREATE TYPE "TimelineEventSource" AS ENUM ('MANUAL', 'AUTO_GPS', 'IMPORTED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT,
    "phone" TEXT,
    "defaultTimeZone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Load" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "driverOperatingAs" "DriverOperatingAs" NOT NULL,
    "loadNumber" TEXT NOT NULL,
    "proNumber" TEXT,
    "bolNumber" TEXT,
    "bookingRefNumber" TEXT,
    "trailerNumber" TEXT,
    "containerNumber" TEXT,
    "sealNumber" TEXT,
    "commodityDesc" TEXT,
    "pickupNumber" TEXT,
    "poNumber" TEXT,
    "loadType" "LoadType" NOT NULL,
    "mode" "LoadMode" NOT NULL,
    "status" "LoadStatus" NOT NULL DEFAULT 'PRE_TRIP',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdTimeZone" TEXT,
    "createdLatitude" DECIMAL(9,6),
    "createdLongitude" DECIMAL(9,6),
    "expectedPickupCity" TEXT,
    "expectedPickupState" TEXT,
    "expectedDeliveryCity" TEXT,
    "expectedDeliveryState" TEXT,
    "brokerCompanyName" TEXT NOT NULL,
    "brokerMcNumber" TEXT,
    "brokerPhone" TEXT,
    "brokerEmail" TEXT,
    "brokerAgentName" TEXT,
    "brokerAgentPhone" TEXT,
    "brokerAgentEmail" TEXT,
    "dispatcherName" TEXT,
    "dispatcherCompanyName" TEXT,
    "dispatcherPhone" TEXT,
    "dispatcherEmail" TEXT,
    "carrierCompanyName" TEXT,
    "carrierMcNumber" TEXT,
    "carrierDotNumber" TEXT,
    "carrierMainPhone" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Load_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Stop" (
    "id" TEXT NOT NULL,
    "loadId" TEXT NOT NULL,
    "type" "StopType" NOT NULL,
    "sequence" INTEGER NOT NULL,
    "facilityName" TEXT NOT NULL,
    "phone" TEXT,
    "street1" TEXT NOT NULL,
    "street2" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'US',
    "appointmentType" "AppointmentType" NOT NULL DEFAULT 'UNKNOWN',
    "appointmentAt" TIMESTAMP(3),
    "operatingHoursText" TEXT,
    "checkInInstructions" TEXT,
    "dockDoorInfo" TEXT,
    "lumperRequired" BOOLEAN NOT NULL DEFAULT false,
    "ppeRequired" BOOLEAN NOT NULL DEFAULT false,
    "idRequired" BOOLEAN NOT NULL DEFAULT false,
    "guardShackCheckIn" BOOLEAN NOT NULL DEFAULT false,
    "specialInstructions" TEXT,
    "handlingType" "HandlingType" NOT NULL DEFAULT 'UNKNOWN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Stop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateAgreement" (
    "id" TEXT NOT NULL,
    "loadId" TEXT NOT NULL,
    "rateAmount" DECIMAL(12,2) NOT NULL,
    "rateType" "RateType" NOT NULL,
    "quotedMiles" INTEGER,
    "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'STANDARD',
    "quickPayFee" DECIMAL(12,2),
    "detentionStartsAfterHours" INTEGER,
    "detentionRatePerHour" DECIMAL(12,2),
    "detentionMaxCap" DECIMAL(12,2),
    "layoverTermsText" TEXT,
    "tonuTermsText" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateAgreement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Accessorial" (
    "id" TEXT NOT NULL,
    "rateAgreementId" TEXT NOT NULL,
    "type" "AccessorialType" NOT NULL,
    "amount" DECIMAL(12,2),
    "notes" TEXT,

    CONSTRAINT "Accessorial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EquipmentSpec" (
    "id" TEXT NOT NULL,
    "loadId" TEXT NOT NULL,
    "trailerType" "LoadType" NOT NULL,
    "temperatureSetpointF" DECIMAL(6,2),
    "temperatureMinF" DECIMAL(6,2),
    "temperatureMaxF" DECIMAL(6,2),
    "weightLbs" DECIMAL(12,2),
    "palletCount" INTEGER,
    "pieceCount" INTEGER,
    "hazmat" BOOLEAN NOT NULL DEFAULT false,
    "highValue" BOOLEAN NOT NULL DEFAULT false,
    "sealRequired" BOOLEAN NOT NULL DEFAULT false,
    "securementRequired" BOOLEAN NOT NULL DEFAULT false,
    "securementMethods" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EquipmentSpec_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrackingRequirement" (
    "id" TEXT NOT NULL,
    "loadId" TEXT NOT NULL,
    "trackingRequired" BOOLEAN NOT NULL DEFAULT false,
    "provider" "TrackingProvider",
    "providerOther" TEXT,
    "penaltyAmount" DECIMAL(12,2),
    "penaltyNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrackingRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PenaltyTerms" (
    "id" TEXT NOT NULL,
    "loadId" TEXT NOT NULL,
    "lateFeeAmount" DECIMAL(12,2),
    "scaleRequired" BOOLEAN NOT NULL DEFAULT false,
    "scalePenaltyAmount" DECIMAL(12,2),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PenaltyTerms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimelineEvent" (
    "id" TEXT NOT NULL,
    "loadId" TEXT NOT NULL,
    "type" "TimelineEventType" NOT NULL,
    "source" "TimelineEventSource" NOT NULL DEFAULT 'MANUAL',
    "occurredAtUtc" TIMESTAMP(3) NOT NULL,
    "timeZone" TEXT NOT NULL,
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "locationText" TEXT,
    "notes" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TimelineEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attachment" (
    "id" TEXT NOT NULL,
    "loadId" TEXT,
    "timelineEventId" TEXT,
    "type" "AttachmentType" NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT,
    "storageKey" TEXT NOT NULL,
    "sizeBytes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Load_loadNumber_idx" ON "Load"("loadNumber");

-- CreateIndex
CREATE INDEX "Load_status_idx" ON "Load"("status");

-- CreateIndex
CREATE INDEX "Load_createdAt_idx" ON "Load"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Load_driverId_loadNumber_key" ON "Load"("driverId", "loadNumber");

-- CreateIndex
CREATE INDEX "Stop_loadId_type_idx" ON "Stop"("loadId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "Stop_loadId_sequence_key" ON "Stop"("loadId", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "RateAgreement_loadId_key" ON "RateAgreement"("loadId");

-- CreateIndex
CREATE INDEX "Accessorial_rateAgreementId_idx" ON "Accessorial"("rateAgreementId");

-- CreateIndex
CREATE UNIQUE INDEX "EquipmentSpec_loadId_key" ON "EquipmentSpec"("loadId");

-- CreateIndex
CREATE UNIQUE INDEX "TrackingRequirement_loadId_key" ON "TrackingRequirement"("loadId");

-- CreateIndex
CREATE UNIQUE INDEX "PenaltyTerms_loadId_key" ON "PenaltyTerms"("loadId");

-- CreateIndex
CREATE INDEX "TimelineEvent_loadId_occurredAtUtc_idx" ON "TimelineEvent"("loadId", "occurredAtUtc");

-- CreateIndex
CREATE INDEX "TimelineEvent_type_idx" ON "TimelineEvent"("type");

-- CreateIndex
CREATE INDEX "Attachment_loadId_type_idx" ON "Attachment"("loadId", "type");

-- CreateIndex
CREATE INDEX "Attachment_timelineEventId_idx" ON "Attachment"("timelineEventId");

-- AddForeignKey
ALTER TABLE "Load" ADD CONSTRAINT "Load_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stop" ADD CONSTRAINT "Stop_loadId_fkey" FOREIGN KEY ("loadId") REFERENCES "Load"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RateAgreement" ADD CONSTRAINT "RateAgreement_loadId_fkey" FOREIGN KEY ("loadId") REFERENCES "Load"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Accessorial" ADD CONSTRAINT "Accessorial_rateAgreementId_fkey" FOREIGN KEY ("rateAgreementId") REFERENCES "RateAgreement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentSpec" ADD CONSTRAINT "EquipmentSpec_loadId_fkey" FOREIGN KEY ("loadId") REFERENCES "Load"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackingRequirement" ADD CONSTRAINT "TrackingRequirement_loadId_fkey" FOREIGN KEY ("loadId") REFERENCES "Load"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PenaltyTerms" ADD CONSTRAINT "PenaltyTerms_loadId_fkey" FOREIGN KEY ("loadId") REFERENCES "Load"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimelineEvent" ADD CONSTRAINT "TimelineEvent_loadId_fkey" FOREIGN KEY ("loadId") REFERENCES "Load"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_loadId_fkey" FOREIGN KEY ("loadId") REFERENCES "Load"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_timelineEventId_fkey" FOREIGN KEY ("timelineEventId") REFERENCES "TimelineEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
