-- Limpiar datos existentes con dimensiones incorrectas
TRUNCATE TABLE "document_vectors" CASCADE;

-- Cambiar tipo de columna embedding de vector(1536) a vector(768)
ALTER TABLE "document_vectors" 
ALTER COLUMN "embedding" TYPE vector(768) USING embedding::text::vector(768);
