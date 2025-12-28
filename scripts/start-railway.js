#!/usr/bin/env node

/**
 * Script de inicio para Railway
 * Instala pgvector y maneja migraciones
 */

const { execSync } = require('child_process');
const { Client } = require('pg');

console.log('🚀 Iniciando aplicación en Railway...');

// Función para crear la extensión vector
async function ensureVectorExtension() {
  console.log('🔧 Verificando extensión pgvector...');
  
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL no está configurada');
  }
  
  const client = new Client({ connectionString: databaseUrl });
  
  try {
    await client.connect();
    
    // Verificar si la extensión ya existe
    const checkResult = await client.query(
      "SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'vector') as exists"
    );
    
    if (checkResult.rows[0].exists) {
      console.log('✅ Extensión pgvector ya está instalada');
      return;
    }
    
    // Intentar crear la extensión
    console.log('📦 Intentando instalar extensión pgvector...');
    await client.query('CREATE EXTENSION IF NOT EXISTS vector;');
    console.log('✅ Extensión pgvector instalada exitosamente');
  } catch (error) {
    if (error.message.includes('extension "vector" is not available') || 
        error.message.includes('No such file or directory')) {
      console.error('❌ ERROR: pgvector no está instalado en Railway PostgreSQL');
      console.error('');
      console.error('💡 SOLUCIÓN:');
      console.error('   1. Elimina tu PostgreSQL actual en Railway');
      console.error('   2. Crea uno nuevo usando el template "pgvector" o "pgvector-pg17"');
      console.error('   3. O contacta a Railway para habilitar pgvector en tu instancia');
      console.error('');
      throw new Error('pgvector no disponible. Usa el template de pgvector en Railway.');
    }
    throw error;
  } finally {
    await client.end();
  }
}

// Función para resolver migraciones fallidas
function resolveFailedMigration() {
  try {
    console.log('🔧 Resolviendo migración fallida...');
    execSync('npx prisma migrate resolve --rolled-back 20251228162925_init', {
      stdio: 'inherit'
    });
    console.log('✅ Migración resuelta');
    return true;
  } catch (error) {
    console.log('ℹ️  No se pudo resolver (puede ser normal si no hay migraciones fallidas)');
    return false;
  }
}

// Función principal
async function start() {
  try {
    // 1. Asegurar que la extensión vector existe
    await ensureVectorExtension();
    
    // 2. Resolver migraciones fallidas si existen
    resolveFailedMigration();
    
    // 3. Ejecutar migraciones
    console.log('📦 Ejecutando migraciones...');
    try {
      execSync('npx prisma migrate deploy', { stdio: 'inherit' });
      console.log('✅ Migraciones aplicadas exitosamente');
    } catch (migrateError) {
      console.log('⚠️  Error en migraciones, intentando resolver y reintentar...');
      
      // Resolver y reintentar
      if (resolveFailedMigration()) {
        execSync('npx prisma migrate deploy', { stdio: 'inherit' });
        console.log('✅ Migraciones aplicadas después de resolver');
      } else {
        throw migrateError;
      }
    }
    
    // 4. Iniciar servidor
    console.log('🌐 Iniciando servidor...');
    execSync('npm run start', { stdio: 'inherit' });
  } catch (error) {
    console.error('❌ Error fatal:', error.message);
    process.exit(1);
  }
}

start();

