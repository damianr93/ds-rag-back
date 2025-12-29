-- Migración para agregar columnas faltantes y crear tabla tracked_files
-- Ejecuta este script en tu base de datos de Railway

-- 1. Agregar columnas faltantes en document_sources
ALTER TABLE "document_sources" 
  ADD COLUMN IF NOT EXISTS "clientId" TEXT,
  ADD COLUMN IF NOT EXISTS "clientSecret" TEXT,
  ADD COLUMN IF NOT EXISTS "lastError" TEXT;

-- 2. Crear tabla tracked_files si no existe
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

-- 3. Crear índices si no existen
CREATE UNIQUE INDEX IF NOT EXISTS "tracked_files_sourceId_fileId_key" ON "tracked_files"("sourceId", "fileId");
CREATE INDEX IF NOT EXISTS "tracked_files_sourceId_idx" ON "tracked_files"("sourceId");
CREATE INDEX IF NOT EXISTS "tracked_files_status_idx" ON "tracked_files"("status");

-- 4. Agregar foreign key si no existe
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

-- 5. Verificar que todo se creó correctamente
SELECT 'document_sources columns:' as info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'document_sources' 
ORDER BY ordinal_position;

SELECT 'tracked_files exists:' as info;
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'tracked_files'
) as table_exists;

