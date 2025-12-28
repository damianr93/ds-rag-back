#!/usr/bin/env node

/**
 * Script de inicio para Railway
 * Maneja migraciones fallidas automáticamente
 */

const { execSync } = require('child_process');

console.log('🚀 Iniciando aplicación en Railway...');

// Intentar ejecutar migraciones
try {
  console.log('📦 Ejecutando migraciones...');
  execSync('npx prisma migrate deploy', { stdio: 'inherit' });
  console.log('✅ Migraciones aplicadas exitosamente');
} catch (error) {
  console.log('⚠️  Error en migraciones, intentando resolver...');
  
  // Si hay migración fallida, intentar resolverla
  try {
    execSync('npx prisma migrate resolve --rolled-back 20251228162925_init', {
      stdio: 'inherit'
    });
    console.log('✅ Migración resuelta, reintentando...');
    
    // Reintentar migraciones
    execSync('npx prisma migrate deploy', { stdio: 'inherit' });
    console.log('✅ Migraciones aplicadas después de resolver');
  } catch (resolveError) {
    console.log('❌ No se pudo resolver automáticamente');
    console.log('💡 Ejecuta manualmente: npx prisma migrate resolve --rolled-back 20251228162925_init');
    process.exit(1);
  }
}

// Iniciar servidor
console.log('🌐 Iniciando servidor...');
execSync('npm run start', { stdio: 'inherit' });

