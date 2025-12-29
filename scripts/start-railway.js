#!/usr/bin/env node

/**
 * Script de inicio para Railway
 * Crea extensión pgvector y maneja migraciones
 */

const { execSync } = require('child_process');
const { PrismaClient } = require('@prisma/client');

console.log('🚀 Iniciando aplicación en Railway...');

// Crear extensión pgvector si no existe
async function ensureVectorExtension() {
  const prisma = new PrismaClient();
  try {
    console.log('🔧 Verificando extensión pgvector...');
    await prisma.$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS vector;');
    console.log('✅ Extensión pgvector verificada');
  } catch (error) {
    console.error('❌ Error al crear extensión pgvector:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Agregar columnas faltantes en document_sources si no existen
async function ensureDocumentSourceColumns() {
  const prisma = new PrismaClient();
  try {
    console.log('🔧 Verificando columnas en document_sources...');
    
    // Verificar y agregar columnas faltantes
    await prisma.$executeRawUnsafe(`
      DO $$ 
      BEGIN
        -- Agregar clientId si no existe
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'document_sources' AND column_name = 'clientId'
        ) THEN
          ALTER TABLE "document_sources" ADD COLUMN "clientId" TEXT;
          RAISE NOTICE 'Columna clientId agregada';
        END IF;
        
        -- Agregar clientSecret si no existe
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'document_sources' AND column_name = 'clientSecret'
        ) THEN
          ALTER TABLE "document_sources" ADD COLUMN "clientSecret" TEXT;
          RAISE NOTICE 'Columna clientSecret agregada';
        END IF;
        
        -- Agregar lastError si no existe
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'document_sources' AND column_name = 'lastError'
        ) THEN
          ALTER TABLE "document_sources" ADD COLUMN "lastError" TEXT;
          RAISE NOTICE 'Columna lastError agregada';
        END IF;
      END $$;
    `);
    
    console.log('✅ Columnas en document_sources verificadas');
  } catch (error) {
    console.error('❌ Error al verificar columnas:', error.message);
    // No lanzar error, solo loguear - las migraciones pueden manejarlo
  } finally {
    await prisma.$disconnect();
  }
}

// Crear tabla tracked_files si no existe
async function ensureTrackedFilesTable() {
  const prisma = new PrismaClient();
  try {
    console.log('🔧 Verificando tabla tracked_files...');
    
    // Verificar si la tabla existe
    const result = await prisma.$queryRawUnsafe(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'tracked_files'
      ) as exists;
    `);
    
    const tableExists = result[0]?.exists || false;
    
    if (!tableExists) {
      console.log('📦 Creando tabla tracked_files...');
      
      await prisma.$executeRawUnsafe(`
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

        CREATE UNIQUE INDEX "tracked_files_sourceId_fileId_key" ON "tracked_files"("sourceId", "fileId");
        CREATE INDEX "tracked_files_sourceId_idx" ON "tracked_files"("sourceId");
        CREATE INDEX "tracked_files_status_idx" ON "tracked_files"("status");

        ALTER TABLE "tracked_files" ADD CONSTRAINT "tracked_files_sourceId_fkey" 
          FOREIGN KEY ("sourceId") REFERENCES "document_sources"("id") 
          ON DELETE CASCADE ON UPDATE CASCADE;
      `);
      
      console.log('✅ Tabla tracked_files creada');
    } else {
      console.log('✅ Tabla tracked_files ya existe');
    }
  } catch (error) {
    console.error('❌ Error al verificar tabla tracked_files:', error.message);
    // No lanzar error, solo loguear
  } finally {
    await prisma.$disconnect();
  }
}

// Resolver migraciones fallidas si existen
function resolveFailedMigration() {
  try {
    execSync('npx prisma migrate resolve --rolled-back 20251228162925_init', {
      stdio: 'pipe'
    });
    console.log('✅ Migración fallida resuelta');
    return true;
  } catch (error) {
    return false;
  }
}

// Ejecutar migraciones
function runMigrations() {
  try {
    console.log('📦 Ejecutando migraciones...');
    execSync('npx prisma migrate deploy', { stdio: 'inherit' });
    console.log('✅ Migraciones aplicadas exitosamente');
    return true;
  } catch (error) {
    return false;
  }
}

// Función principal
async function start() {
  try {
    // 1. Crear extensión pgvector
    await ensureVectorExtension();
    
    // 2. Agregar columnas faltantes si no existen
    await ensureDocumentSourceColumns();
    
    // 3. Crear tabla tracked_files si no existe
    await ensureTrackedFilesTable();
    
    // 4. Intentar ejecutar migraciones
    if (!runMigrations()) {
      console.log('⚠️  Error en migraciones, intentando resolver...');
      
      // Resolver y reintentar
      if (resolveFailedMigration()) {
        if (!runMigrations()) {
          throw new Error('No se pudieron aplicar las migraciones');
        }
      } else {
        throw new Error('No se pudo resolver la migración fallida');
      }
    }
    
    // 5. Iniciar servidor
    console.log('🌐 Iniciando servidor...');
    execSync('npm run start', { stdio: 'inherit' });
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

start();

