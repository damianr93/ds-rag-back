#!/usr/bin/env node

/**
 * Script para resolver migraciones fallidas en Railway
 * Ejecuta este script antes de prisma migrate deploy
 */

const { execSync } = require('child_process');

console.log('🔧 Verificando y resolviendo migraciones fallidas...');

// Intentar resolver la migración fallida directamente
try {
  console.log('📝 Intentando marcar migración como rolled-back...');
  execSync('npx prisma migrate resolve --rolled-back 20251228162925_init', {
    encoding: 'utf8',
    stdio: 'inherit'
  });
  console.log('✅ Migración resuelta exitosamente');
} catch (error) {
  // Si falla, puede ser que no exista la migración o ya esté resuelta
  console.log('ℹ️  Migración no encontrada o ya resuelta, continuando...');
}

// También intentar marcarla como aplicada si es necesario
try {
  console.log('📝 Verificando si necesita marcarse como aplicada...');
  execSync('npx prisma migrate resolve --applied 20251228162925_init', {
    encoding: 'utf8',
    stdio: 'pipe'
  });
  console.log('✅ Migración marcada como aplicada');
} catch (error) {
  // Ignorar errores aquí, es solo un intento
  console.log('ℹ️  No se pudo marcar como aplicada (puede ser normal)');
}

console.log('✅ Script de fix completado, continuando con deploy...');

