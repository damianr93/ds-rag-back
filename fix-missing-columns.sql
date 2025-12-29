-- Migración para agregar columnas faltantes en document_sources
-- Ejecuta este script en tu base de datos de Railway

-- Agregar columnas faltantes
ALTER TABLE "document_sources" 
  ADD COLUMN IF NOT EXISTS "clientId" TEXT,
  ADD COLUMN IF NOT EXISTS "clientSecret" TEXT,
  ADD COLUMN IF NOT EXISTS "lastError" TEXT;

-- Verificar que se agregaron correctamente
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'document_sources' 
ORDER BY ordinal_position;

