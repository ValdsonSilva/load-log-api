-- CreateEnum
CREATE TYPE "LoadCommentVisibility" AS ENUM ('DRIVER_DISPATCHER', 'INTERNAL_DISPATCHER', 'ADMIN_ONLY');

-- CreateEnum
CREATE TYPE "LoadCustomFieldStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateTable
CREATE TABLE "LoadFieldRevision" (
    "id" TEXT NOT NULL,
    "loadId" TEXT NOT NULL,
    "fieldName" TEXT NOT NULL,
    "oldValue" JSONB,
    "newValue" JSONB,
    "changedById" TEXT,
    "changedByActorType" "FieldSourceActorType" NOT NULL,
    "reason" TEXT,
    "sourceContext" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoadFieldRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoadCustomField" (
    "id" TEXT NOT NULL,
    "loadId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "value" TEXT,
    "status" "LoadCustomFieldStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdById" TEXT,
    "sourceActorType" "FieldSourceActorType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoadCustomField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoadComment" (
    "id" TEXT NOT NULL,
    "loadId" TEXT NOT NULL,
    "authorId" TEXT,
    "actorType" "FieldSourceActorType" NOT NULL,
    "visibility" "LoadCommentVisibility" NOT NULL DEFAULT 'DRIVER_DISPATCHER',
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoadComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LoadFieldRevision_loadId_idx" ON "LoadFieldRevision"("loadId");

-- CreateIndex
CREATE INDEX "LoadFieldRevision_fieldName_idx" ON "LoadFieldRevision"("fieldName");

-- CreateIndex
CREATE INDEX "LoadFieldRevision_changedById_idx" ON "LoadFieldRevision"("changedById");

-- CreateIndex
CREATE INDEX "LoadFieldRevision_changedByActorType_idx" ON "LoadFieldRevision"("changedByActorType");

-- CreateIndex
CREATE INDEX "LoadFieldRevision_createdAt_idx" ON "LoadFieldRevision"("createdAt");

-- CreateIndex
CREATE INDEX "LoadCustomField_loadId_idx" ON "LoadCustomField"("loadId");

-- CreateIndex
CREATE INDEX "LoadCustomField_key_idx" ON "LoadCustomField"("key");

-- CreateIndex
CREATE INDEX "LoadCustomField_status_idx" ON "LoadCustomField"("status");

-- CreateIndex
CREATE INDEX "LoadCustomField_createdById_idx" ON "LoadCustomField"("createdById");

-- CreateIndex
CREATE UNIQUE INDEX "LoadCustomField_loadId_key_key" ON "LoadCustomField"("loadId", "key");

-- CreateIndex
CREATE INDEX "LoadComment_loadId_idx" ON "LoadComment"("loadId");

-- CreateIndex
CREATE INDEX "LoadComment_authorId_idx" ON "LoadComment"("authorId");

-- CreateIndex
CREATE INDEX "LoadComment_actorType_idx" ON "LoadComment"("actorType");

-- CreateIndex
CREATE INDEX "LoadComment_visibility_idx" ON "LoadComment"("visibility");

-- CreateIndex
CREATE INDEX "LoadComment_createdAt_idx" ON "LoadComment"("createdAt");

-- AddForeignKey
ALTER TABLE "LoadFieldRevision" ADD CONSTRAINT "LoadFieldRevision_loadId_fkey" FOREIGN KEY ("loadId") REFERENCES "Load"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoadFieldRevision" ADD CONSTRAINT "LoadFieldRevision_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoadCustomField" ADD CONSTRAINT "LoadCustomField_loadId_fkey" FOREIGN KEY ("loadId") REFERENCES "Load"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoadCustomField" ADD CONSTRAINT "LoadCustomField_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoadComment" ADD CONSTRAINT "LoadComment_loadId_fkey" FOREIGN KEY ("loadId") REFERENCES "Load"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoadComment" ADD CONSTRAINT "LoadComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
