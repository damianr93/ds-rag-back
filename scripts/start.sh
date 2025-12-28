#!/bin/bash
set -e

echo "🚀 Iniciando aplicación..."

# Intentar resolver migraciones fallidas
echo "🔧 Verificando migraciones..."
node scripts/fix-migrations.js || true

# Ejecutar migraciones
echo "📦 Ejecutando migraciones..."
if ! npx prisma migrate deploy; then
  echo "⚠️  Migración falló, intentando resolver..."
  node scripts/fix-migrations.js || true
  echo "🔄 Reintentando migraciones..."
  npx prisma migrate deploy
fi

# Iniciar servidor
echo "✅ Iniciando servidor..."
npm run start

