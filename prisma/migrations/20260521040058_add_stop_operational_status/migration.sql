-- CreateEnum
CREATE TYPE "StopStatus" AS ENUM ('PLANNED', 'ARRIVED', 'CHECKED_IN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- AlterTable
ALTER TABLE "Stop" ADD COLUMN     "actualArrivedAt" TIMESTAMP(3),
ADD COLUMN     "actualCheckedInAt" TIMESTAMP(3),
ADD COLUMN     "actualCompletedAt" TIMESTAMP(3),
ADD COLUMN     "actualStartedAt" TIMESTAMP(3),
ADD COLUMN     "autoUpdatedFromTimeline" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastTimelineEventId" TEXT,
ADD COLUMN     "status" "StopStatus" NOT NULL DEFAULT 'PLANNED';

-- CreateIndex
CREATE INDEX "Stop_status_idx" ON "Stop"("status");

-- CreateIndex
CREATE INDEX "Stop_lastTimelineEventId_idx" ON "Stop"("lastTimelineEventId");
