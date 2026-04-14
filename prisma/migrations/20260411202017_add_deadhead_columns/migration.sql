-- AlterTable
ALTER TABLE "Load" ADD COLUMN     "deadheadStartAt" TIMESTAMP(3),
ADD COLUMN     "deadheadStartLatitude" DECIMAL(9,6),
ADD COLUMN     "deadheadStartLongitude" DECIMAL(9,6),
ADD COLUMN     "deadheadTotalDistance" DOUBLE PRECISION,
ADD COLUMN     "deadheadTotalMinutes" INTEGER;

-- CreateTable
CREATE TABLE "_AccessorialToAttachment" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_AccessorialToAttachment_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_AccessorialToAttachment_B_index" ON "_AccessorialToAttachment"("B");

-- AddForeignKey
ALTER TABLE "_AccessorialToAttachment" ADD CONSTRAINT "_AccessorialToAttachment_A_fkey" FOREIGN KEY ("A") REFERENCES "Accessorial"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AccessorialToAttachment" ADD CONSTRAINT "_AccessorialToAttachment_B_fkey" FOREIGN KEY ("B") REFERENCES "Attachment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
