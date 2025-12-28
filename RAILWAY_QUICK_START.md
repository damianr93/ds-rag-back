# 🚀 DEPLOY RÁPIDO A RAILWAY

## 📦 Pre-Deploy Local

```bash
# 1. Generar claves seguras
npm run generate-keys

# 2. Probar build local
npm run build
npm start
```

## 🚂 Railway Deploy - 3 Pasos

### Paso 1: Crear Proyecto
1. **Railway.app** → **New Project** → **Deploy from GitHub**
2. Selecciona tu repo `ds-rag`

### Paso 2: Agregar PostgreSQL
1. **+ New** → **Database** → **PostgreSQL**
2. En el servicio PostgreSQL → **Query**:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```

### Paso 3: Variables de Entorno
En el servicio **backend** → **Variables**, agrega:

```bash
# OBLIGATORIAS ⚠️
OPENAI_API_KEY=sk-tu-key-aqui
JWT_SEED=tu-jwt-seed-de-64-caracteres
ENCRYPTION_KEY=tu-encryption-key-de-32-caracteres

# MODELOS
OPENAI_CHAT_MODEL=gpt-4o-mini
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
LLM_PROVIDER=openai

# PRODUCCIÓN
NODE_ENV=production
```

### Paso 4: Actualizar URLs (después del primer deploy)
```bash
BACKEND_URL=https://tu-backend.up.railway.app
FRONTEND_URL=https://tu-frontend.up.railway.app
```

## ✅ Verificación

1. **Health Check**: `https://tu-backend.up.railway.app/api/health`
2. **Respuesta esperada**: `{"ok": true}`

## 🎯 Crear Admin

```bash
railway run npm run make-admin -- tu-email@ejemplo.com
```

## 📝 Notas Importantes

- ✅ Railway configura `DATABASE_URL` automáticamente
- ✅ `pgvector` ya está incluido
- ✅ Auto-deploy en cada push a GitHub
- ✅ Build automático con los scripts de `package.json`

**¡Todo listo!** 🎉

---

Documentación completa en: [RAILWAY_DEPLOY.md](./RAILWAY_DEPLOY.md)

