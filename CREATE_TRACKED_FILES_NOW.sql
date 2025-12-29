-- ⚠️ EJECUTA ESTE SQL AHORA EN RAILWAY → PostgreSQL → Query
-- Esto creará la tabla tracked_files inmediatamente

-- 1. Crear tabla tracked_files
CREATE TABLE IF NOT EXISTS "tracked_files" (
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

-- 2. Crear índices
CREATE UNIQUE INDEX IF NOT EXISTS "tracked_files_sourceId_fileId_key" ON "tracked_files"("sourceId", "fileId");
CREATE INDEX IF NOT EXISTS "tracked_files_sourceId_idx" ON "tracked_files"("sourceId");
CREATE INDEX IF NOT EXISTS "tracked_files_status_idx" ON "tracked_files"("status");

-- 3. Agregar foreign key
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'tracked_files_sourceId_fkey'
  ) THEN
    ALTER TABLE "tracked_files" 
      ADD CONSTRAINT "tracked_files_sourceId_fkey" 
      FOREIGN KEY ("sourceId") REFERENCES "document_sources"("id") 
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- 4. Verificar que se creó
SELECT '✅ Tabla tracked_files creada exitosamente' as resultado;

