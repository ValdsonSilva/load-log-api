-- CreateEnum
CREATE TYPE "TripPhase" AS ENUM ('BOBTAIL', 'DEADHEAD', 'LOADED', 'POST_DELIVERY', 'OFF_DUTY');

-- AlterTable
ALTER TABLE "Load" ADD COLUMN     "realMilesBobtail" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "realMilesDeadhead" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "realMilesLoaded" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "realMilesPostDelivery" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "totalRealMiles" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "LocationPoint" (
    "id" TEXT NOT NULL,
    "loadId" TEXT NOT NULL,
    "latitude" DECIMAL(9,6) NOT NULL,
    "longitude" DECIMAL(9,6) NOT NULL,
    "speed" DOUBLE PRECISION,
    "accuracy" DOUBLE PRECISION,
    "phase" "TripPhase" NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LocationPoint_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LocationPoint_loadId_timestamp_idx" ON "LocationPoint"("loadId", "timestamp");

-- AddForeignKey
ALTER TABLE "LocationPoint" ADD CONSTRAINT "LocationPoint_loadId_fkey" FOREIGN KEY ("loadId") REFERENCES "Load"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
