/*
  Warnings:

  - The values [DRIVER_ASSIST,HAZMAT,REEFER_FUEL,TARP,STOP_OFF] on the enum `AccessorialType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to alter the column `amount` on the `Accessorial` table. The data in that column could be lost. The data in that column will be cast from `Decimal(12,2)` to `Decimal(10,2)`.
  - You are about to drop the `_AccessorialToAttachment` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `updatedAt` to the `Accessorial` table without a default value. This is not possible if the table is not empty.
  - Made the column `amount` on table `Accessorial` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "AccessorialType_new" AS ENUM ('FUEL', 'TOLL', 'PARKING', 'MAINTENANCE', 'LUMPER', 'SCALE', 'WASHOUT', 'FOOD', 'DETENTION', 'LAYOVER', 'TONU', 'OTHER');
ALTER TABLE "Accessorial" ALTER COLUMN "type" TYPE "AccessorialType_new" USING ("type"::text::"AccessorialType_new");
ALTER TYPE "AccessorialType" RENAME TO "AccessorialType_old";
ALTER TYPE "AccessorialType_new" RENAME TO "AccessorialType";
DROP TYPE "public"."AccessorialType_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "_AccessorialToAttachment" DROP CONSTRAINT "_AccessorialToAttachment_A_fkey";

-- DropForeignKey
ALTER TABLE "_AccessorialToAttachment" DROP CONSTRAINT "_AccessorialToAttachment_B_fkey";

-- AlterTable
ALTER TABLE "Accessorial" ADD COLUMN     "attachmentId" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'USD',
ADD COLUMN     "expenseDate" TIMESTAMP(3),
ADD COLUMN     "location" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "vendor" TEXT,
ALTER COLUMN "amount" SET NOT NULL,
ALTER COLUMN "amount" SET DATA TYPE DECIMAL(10,2);

-- DropTable
DROP TABLE "_AccessorialToAttachment";

-- CreateIndex
CREATE INDEX "Accessorial_type_idx" ON "Accessorial"("type");

-- CreateIndex
CREATE INDEX "Accessorial_expenseDate_idx" ON "Accessorial"("expenseDate");

-- AddForeignKey
ALTER TABLE "Accessorial" ADD CONSTRAINT "Accessorial_attachmentId_fkey" FOREIGN KEY ("attachmentId") REFERENCES "Attachment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
