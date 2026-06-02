-- CreateTable
CREATE TABLE "LoadBaseDetailsRevision" (
    "id" TEXT NOT NULL,
    "loadId" TEXT NOT NULL,
    "editedById" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "before" JSONB NOT NULL,
    "after" JSONB NOT NULL,
    "changes" JSONB NOT NULL,
    "reason" TEXT,
    "revisionHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoadBaseDetailsRevision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LoadBaseDetailsRevision_loadId_createdAt_idx" ON "LoadBaseDetailsRevision"("loadId", "createdAt");

-- CreateIndex
CREATE INDEX "LoadBaseDetailsRevision_editedById_idx" ON "LoadBaseDetailsRevision"("editedById");

-- CreateIndex
CREATE UNIQUE INDEX "LoadBaseDetailsRevision_loadId_version_key" ON "LoadBaseDetailsRevision"("loadId", "version");

-- AddForeignKey
ALTER TABLE "LoadBaseDetailsRevision" ADD CONSTRAINT "LoadBaseDetailsRevision_loadId_fkey" FOREIGN KEY ("loadId") REFERENCES "Load"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoadBaseDetailsRevision" ADD CONSTRAINT "LoadBaseDetailsRevision_editedById_fkey" FOREIGN KEY ("editedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
