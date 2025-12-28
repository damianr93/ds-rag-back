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
    
    // 2. Intentar ejecutar migraciones
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
    
    // 3. Iniciar servidor
    console.log('🌐 Iniciando servidor...');
    execSync('npm run start', { stdio: 'inherit' });
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

start();

