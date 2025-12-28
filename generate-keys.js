#!/usr/bin/env node

/**
 * Generador de claves seguras para Railway
 * 
 * Uso: node generate-keys.js
 */

const crypto = require('crypto');

console.log('🔐 Generando claves seguras para Railway...\n');

// Generar JWT_SEED (64 caracteres)
const jwtSeed = crypto.randomBytes(32).toString('hex');
console.log('JWT_SEED (copia esto en Railway):');
console.log(jwtSeed);
console.log('');

// Generar ENCRYPTION_KEY (exactamente 32 caracteres)
const encryptionKey = crypto.randomBytes(16).toString('hex');
console.log('ENCRYPTION_KEY (copia esto en Railway):');
console.log(encryptionKey);
console.log('');

// Generar X_TOKEN_API opcional (64 caracteres)
const apiToken = crypto.randomBytes(32).toString('hex');
console.log('X_TOKEN_API (opcional - para seguridad extra):');
console.log(apiToken);
console.log('');

console.log('✅ Claves generadas exitosamente!');
console.log('');
console.log('📝 Copia estas claves en Railway:');
console.log('   1. Ve a tu proyecto en Railway');
console.log('   2. Click en "Variables"');
console.log('   3. Agrega cada clave con su valor');
console.log('');
console.log('⚠️  IMPORTANTE: Guarda estas claves en un lugar seguro!');
console.log('   Si las pierdes, tendrás que regenerarlas y todos los');
console.log('   tokens/datos encriptados quedarán inválidos.');

