-- Limpiar datos existentes con dimensiones incompatibles (768 -> 1536)
TRUNCATE TABLE "document_vectors" CASCADE;
TRUNCATE TABLE "processed_files" CASCADE;

-- Cambiar dimensión de vector de 768 (Ollama embeddinggemma) a 1536 (OpenAI text-embedding-3-small)
ALTER TABLE "document_vectors" 
ALTER COLUMN "embedding" TYPE vector(1536) USING embedding::text::vector(1536);
