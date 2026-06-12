-- CreateEnum
CREATE TYPE "LoadOfferDocumentType" AS ENUM ('RATE_CONFIRMATION', 'INSTRUCTIONS', 'CUSTOMER_DOCUMENT', 'OTHER');

-- CreateTable
CREATE TABLE "LoadOfferDocument" (
    "id" TEXT NOT NULL,
    "loadOfferId" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "type" "LoadOfferDocumentType" NOT NULL DEFAULT 'OTHER',
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT,
    "fileSize" INTEGER,
    "url" TEXT NOT NULL,
    "publicId" TEXT,
    "notes" TEXT,
    "copiedToAttachmentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoadOfferDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LoadOfferDocument_loadOfferId_idx" ON "LoadOfferDocument"("loadOfferId");

-- CreateIndex
CREATE INDEX "LoadOfferDocument_uploadedById_idx" ON "LoadOfferDocument"("uploadedById");

-- CreateIndex
CREATE INDEX "LoadOfferDocument_type_idx" ON "LoadOfferDocument"("type");

-- AddForeignKey
ALTER TABLE "LoadOfferDocument" ADD CONSTRAINT "LoadOfferDocument_loadOfferId_fkey" FOREIGN KEY ("loadOfferId") REFERENCES "LoadOffer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoadOfferDocument" ADD CONSTRAINT "LoadOfferDocument_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoadOfferDocument" ADD CONSTRAINT "LoadOfferDocument_copiedToAttachmentId_fkey" FOREIGN KEY ("copiedToAttachmentId") REFERENCES "Attachment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
