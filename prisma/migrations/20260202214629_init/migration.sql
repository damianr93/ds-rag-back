-- AlterTable
ALTER TABLE "document_sources" ADD COLUMN     "clientId" TEXT,
ADD COLUMN     "clientSecret" TEXT,
ADD COLUMN     "lastError" TEXT;

-- CreateTable
CREATE TABLE "tracked_files" (
    "id" SERIAL NOT NULL,
    "sourceId" INTEGER NOT NULL,
    "fileId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileHash" TEXT,
    "lastModified" TIMESTAMP(3) NOT NULL,
    "lastProcessedAt" TIMESTAMP(3),
    "isFolder" BOOLEAN NOT NULL DEFAULT false,
    "includeChildren" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "errorMessage" TEXT,
    "chunksCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tracked_files_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tracked_files_sourceId_idx" ON "tracked_files"("sourceId");

-- CreateIndex
CREATE INDEX "tracked_files_status_idx" ON "tracked_files"("status");

-- CreateIndex
CREATE UNIQUE INDEX "tracked_files_sourceId_fileId_key" ON "tracked_files"("sourceId", "fileId");

-- AddForeignKey
ALTER TABLE "tracked_files" ADD CONSTRAINT "tracked_files_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "document_sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;
