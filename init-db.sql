-- Script de inicialización para Railway PostgreSQL
-- Este script se ejecuta automáticamente cuando Railway crea la base de datos

-- Habilitar extensión pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- Verificar que se creó correctamente
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_extension WHERE extname = 'vector'
    ) THEN
        RAISE EXCEPTION 'Extensión vector no pudo ser creada';
    END IF;
END $$;

