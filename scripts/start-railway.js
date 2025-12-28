#!/usr/bin/env node

/**
 * Script de inicio para Railway
 * Maneja migraciones y resuelve estados fallidos
 */

const { execSync } = require('child_process');

console.log('🚀 Iniciando aplicación en Railway...');

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
try {
  // Intentar ejecutar migraciones
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
  
  // Iniciar servidor
  console.log('🌐 Iniciando servidor...');
  execSync('npm run start', { stdio: 'inherit' });
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}

