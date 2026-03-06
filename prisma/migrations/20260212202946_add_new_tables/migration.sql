/*
  Warnings:

  - Added the required column `url` to the `Attachment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `hash` to the `TimelineEvent` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sequence` to the `TimelineEvent` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "DisputeType" AS ENUM ('DETENTION', 'LUMPER', 'TONU', 'RATE_MISMATCH', 'TRACKING_PENALTY', 'OTHER');

-- CreateEnum
CREATE TYPE "DisputeStatus" AS ENUM ('OPEN', 'IN_REVIEW', 'RESOLVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PlanType" AS ENUM ('BETA', 'FREE', 'PREMIUM');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'TRIALING', 'PAST_DUE', 'CANCELED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "SubscriptionSource" AS ENUM ('INVITATION', 'PAID', 'PROMO', 'MANUAL');

-- CreateEnum
CREATE TYPE "InvitationCodeStatus" AS ENUM ('ACTIVE', 'DISABLED', 'EXPIRED');

-- DropIndex
DROP INDEX "TimelineEvent_type_idx";

-- AlterTable
ALTER TABLE "Attachment" ADD COLUMN     "checksumSha256" TEXT,
ADD COLUMN     "resourceType" TEXT NOT NULL DEFAULT 'raw',
ADD COLUMN     "uploadedById" TEXT,
ADD COLUMN     "url" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "TimelineEvent" ADD COLUMN     "editedAt" TIMESTAMP(3),
ADD COLUMN     "editedById" TEXT,
ADD COLUMN     "hash" TEXT NOT NULL,
ADD COLUMN     "isEdited" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "originalOccurredAtUtc" TIMESTAMP(3),
ADD COLUMN     "originalPayload" JSONB,
ADD COLUMN     "prevHash" TEXT,
ADD COLUMN     "sequence" INTEGER NOT NULL,
ADD COLUMN     "userId" TEXT;

-- CreateTable
CREATE TABLE "TimelineEventRevision" (
    "id" TEXT NOT NULL,
    "timelineEventId" TEXT NOT NULL,
    "editedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "editedById" TEXT NOT NULL,
    "previousData" JSONB NOT NULL,
    "newData" JSONB NOT NULL,
    "revisionHash" TEXT,
    "wasEditedAfterExport" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT,

    CONSTRAINT "TimelineEventRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoadExport" (
    "id" TEXT NOT NULL,
    "loadId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "exportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "exportedById" TEXT,
    "format" TEXT NOT NULL,
    "fileUrl" TEXT,
    "checksumSha256" TEXT,

    CONSTRAINT "LoadExport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dispute" (
    "id" TEXT NOT NULL,
    "loadId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "disputeType" "DisputeType" NOT NULL,
    "amountClaimed" DECIMAL(12,2) NOT NULL,
    "status" "DisputeStatus" NOT NULL DEFAULT 'OPEN',
    "resolutionNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Dispute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DisputeEvidence" (
    "disputeId" TEXT NOT NULL,
    "attachmentId" TEXT NOT NULL,

    CONSTRAINT "DisputeEvidence_pkey" PRIMARY KEY ("disputeId","attachmentId")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planType" "PlanType" NOT NULL,
    "status" "SubscriptionStatus" NOT NULL,
    "source" "SubscriptionSource" NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvitationCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "planType" "PlanType" NOT NULL,
    "status" "InvitationCodeStatus" NOT NULL DEFAULT 'ACTIVE',
    "maxRedemptions" INTEGER NOT NULL DEFAULT 1,
    "redeemedCount" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvitationCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvitationRedemption" (
    "id" TEXT NOT NULL,
    "codeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "redeemedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvitationRedemption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TimelineEventRevision_timelineEventId_editedAt_idx" ON "TimelineEventRevision"("timelineEventId", "editedAt");

-- CreateIndex
CREATE INDEX "LoadExport_loadId_exportedAt_idx" ON "LoadExport"("loadId", "exportedAt");

-- CreateIndex
CREATE UNIQUE INDEX "LoadExport_loadId_version_key" ON "LoadExport"("loadId", "version");

-- CreateIndex
CREATE INDEX "Dispute_loadId_status_idx" ON "Dispute"("loadId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_userId_key" ON "Subscription"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "InvitationCode_code_key" ON "InvitationCode"("code");

-- CreateIndex
CREATE UNIQUE INDEX "InvitationRedemption_codeId_userId_key" ON "InvitationRedemption"("codeId", "userId");

-- CreateIndex
CREATE INDEX "TimelineEvent_loadId_sequence_idx" ON "TimelineEvent"("loadId", "sequence");

-- AddForeignKey
ALTER TABLE "TimelineEvent" ADD CONSTRAINT "TimelineEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimelineEventRevision" ADD CONSTRAINT "TimelineEventRevision_timelineEventId_fkey" FOREIGN KEY ("timelineEventId") REFERENCES "TimelineEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimelineEventRevision" ADD CONSTRAINT "TimelineEventRevision_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoadExport" ADD CONSTRAINT "LoadExport_loadId_fkey" FOREIGN KEY ("loadId") REFERENCES "Load"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoadExport" ADD CONSTRAINT "LoadExport_exportedById_fkey" FOREIGN KEY ("exportedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_loadId_fkey" FOREIGN KEY ("loadId") REFERENCES "Load"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisputeEvidence" ADD CONSTRAINT "DisputeEvidence_disputeId_fkey" FOREIGN KEY ("disputeId") REFERENCES "Dispute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisputeEvidence" ADD CONSTRAINT "DisputeEvidence_attachmentId_fkey" FOREIGN KEY ("attachmentId") REFERENCES "Attachment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvitationCode" ADD CONSTRAINT "InvitationCode_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvitationRedemption" ADD CONSTRAINT "InvitationRedemption_codeId_fkey" FOREIGN KEY ("codeId") REFERENCES "InvitationCode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvitationRedemption" ADD CONSTRAINT "InvitationRedemption_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
