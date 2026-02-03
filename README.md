# 🎯 DS-RAG Backend - Sistema RAG con Integración Cloud

Sistema de Retrieval Augmented Generation (RAG) con soporte para múltiples fuentes de documentos en la nube (Google Drive, Dropbox, OneDrive).

## 🚀 Características

### RAG & IA
- ✅ **Multi-Provider LLM** (OpenAI o Ollama) configurable vía `.env`
- ✅ **Enlaces clickeables** a documentos fuente en respuestas
- ✅ **Resumen de documento completo** con detección automática
- ✅ **Búsqueda semántica** con pgvector
- ✅ **Optimización de queries** con contexto conversacional
- ✅ **Respuestas estrictas** - SOLO usa información de documentos, no inventa
- ✅ **Siempre en español** - sin cambios de idioma

### Integración Cloud
- ✅ **Google Drive, Dropbox, OneDrive** con OAuth 2.0
- ✅ **Auto-refresh de tokens** OAuth
- ✅ **Sincronización automática** de archivos
- ✅ **Tracking de cambios** en documentos

### Seguridad & Arquitectura
- ✅ **Encriptación AES-256-CBC** para credenciales
- ✅ **PostgreSQL + pgvector** para embeddings
- ✅ **Arquitectura Hexagonal** (Ports & Adapters)
- ✅ **TypeScript + Prisma ORM**
- ✅ **Listo para Railway** ☁️

## 📋 Requisitos Previos

- Node.js 18+ 
- PostgreSQL 14+ con extensión `pgvector`
- API Key de OpenAI
- (Opcional) Docker para desarrollo local

## 🔧 Instalación Local

### 1. Clonar e Instalar

```bash
git clone <tu-repo>
cd ds-rag-back
npm install
```

### 2. Configurar Base de Datos (Docker)

```bash
# Iniciar PostgreSQL con pgvector
docker-compose up -d

# Habilitar extensión vector
docker exec -it ia-postgres-ds psql -U postgres -d ia-rag -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

### 3. Configurar Variables de Entorno

```bash
cp .env.template .env
```

Edita `.env`:

```bash
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/iad_db

# LLM Provider: 'openai' o 'ollama'
LLM_PROVIDER=openai

# OpenAI (si LLM_PROVIDER=openai)
OPENAI_API_KEY=sk-tu-api-key-aqui
OPENAI_CHAT_MODEL=gpt-4o-mini
OPENAI_EMBEDDING_MODEL=text-embedding-3-small

# Ollama (si LLM_PROVIDER=ollama)
OLLAMA_URL=http://localhost:11434
OLLAMA_CHAT_MODEL=gemma3:4b
OLLAMA_EMBEDDING_MODEL=embeddinggemma:latest

# Security (genera claves seguras con: node generate-keys.js)
JWT_SEED=tu-clave-jwt-super-secreta-minimo-64-caracteres
ENCRYPTION_KEY=clave-de-exactamente-32-caracteres

# URLs
BACKEND_URL=http://localhost:3000
FRONTEND_URL=http://localhost:5173

# Server
PORT=3000
NODE_ENV=development
```

### 4. Ejecutar Migraciones

```bash
npx prisma migrate dev --name init
npx prisma generate
```

### 5. Iniciar Servidor

```bash
npm run dev
```

El servidor estará corriendo en `http://localhost:3000`

## 🚂 Deploy en Railway

**[Ver guía completa de deployment →](./RAILWAY_DEPLOY.md)**

### Quick Start (3 pasos):

1. **Generar claves seguras:**
```bash
node generate-keys.js
```

2. **Crear proyecto en Railway:**
   - [railway.app](https://railway.app) → New Project → Deploy from GitHub
   - Agregar PostgreSQL database
   - Habilitar extensión: `CREATE EXTENSION IF NOT EXISTS vector;`

3. **Configurar variables de entorno:**
```bash
OPENAI_API_KEY=sk-tu-key
JWT_SEED=clave-generada
ENCRYPTION_KEY=clave-generada-32-chars
OPENAI_CHAT_MODEL=gpt-4o-mini
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
NODE_ENV=production
```

✅ Railway automáticamente:
- Detecta Node.js
- Ejecuta build y migraciones
- Configura DATABASE_URL
- Habilita pgvector

## 📚 Scripts Disponibles

```bash
npm run dev              # Desarrollo con hot-reload
npm run build            # Compilar TypeScript
npm start                # Producción
npm run prisma:generate  # Generar Prisma Client
npm run prisma:migrate   # Ejecutar migraciones (dev)
npm run prisma:deploy    # Ejecutar migraciones (prod)
npm run railway:build    # Build para Railway
npm run railway:start    # Start para Railway
npm run make-admin       # Crear usuario admin
npm run generate-keys    # Generar claves seguras
npm run check-dimensions # Verificar dimensiones de embeddings
```

## 🏗️ Estructura del Proyecto

```
src/
├── application/          # Lógica de negocio
│   ├── auth/            # Autenticación
│   ├── document-sources/# Fuentes de documentos
│   ├── rag/             # Sistema RAG
│   ├── tracked-files/   # Archivos sincronizados
│   └── services/        # Servicios de aplicación
├── domain/              # Entidades y puertos
│   ├── entities/        # Modelos del dominio
│   └── */ports/         # Interfaces (repositorios, servicios)
├── infrastructure/      # Implementaciones
│   ├── auth/            # JWT, bcrypt
│   ├── db/              # Prisma, PostgreSQL
│   ├── document-sources/# Google Drive, Dropbox, OneDrive
│   ├── rag/             # Extractores, embeddings, chunking
│   └── configuration/   # DI Container
└── presentation/        # API REST
    ├── controllers/     # Controladores
    ├── routes/          # Rutas
    └── middleware/      # Auth, admin, rate limit
```

## 🔐 Seguridad

- **JWT** para autenticación
- **AES-256-CBC** para encriptar credenciales OAuth
- **Rate limiting** en endpoints críticos
- **CORS** configurado
- **Validación** de entradas
- **Roles** de usuario (USER, ADMIN)

## 📊 API Endpoints

### Auth
- `POST /api/auth/register` - Registrar usuario
- `POST /api/auth/login` - Iniciar sesión
- `GET /api/auth/renew` - Renovar token

### RAG
- `POST /api/AI/ask` - Preguntar con RAG
- `POST /api/AI/conversation` - Crear conversación
- `GET /api/AI/conversation/:id/history` - Ver historial
- `GET /api/AI/me/conversations` - Mis conversaciones

### Document Sources (Admin)
- `GET /api/document-sources` - Listar fuentes
- `POST /api/document-sources` - Crear fuente
- `PUT /api/document-sources/:id` - Actualizar fuente
- `DELETE /api/document-sources/:id` - Eliminar fuente
- `GET /api/document-sources/:id/files` - Listar archivos

### OAuth
- `POST /api/document-sources/oauth/authorize` - Iniciar OAuth
- `GET /api/document-sources/oauth/callback` - Callback OAuth

### Tracked Files
- `POST /api/tracked-files` - Marcar archivo para RAG
- `DELETE /api/tracked-files` - Desmarcar archivo
- `POST /api/tracked-files/sync` - Sincronizar archivos
- `GET /api/tracked-files/sync/status` - Estado de sync

## 🛠️ Tecnologías

- **Node.js** + **TypeScript**
- **Express.js** - Framework web
- **Prisma** - ORM
- **PostgreSQL** + **pgvector** - Base de datos vectorial
- **OpenAI API** / **Ollama** - Embeddings y LLM (configurable)
- **JWT** - Autenticación
- **bcrypt** - Hashing de passwords
- **axios** - HTTP client para APIs externas

## 🤖 Cambiar Provider de LLM

El sistema soporta múltiples providers. Para cambiar entre OpenAI y Ollama:

### Usar OpenAI (Recomendado para producción)
```bash
# En .env
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-tu-key-aqui
OPENAI_CHAT_MODEL=gpt-4o-mini
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
```

### Usar Ollama (Recomendado para desarrollo local)
```bash
# 1. Instalar Ollama
# https://ollama.ai

# 2. Descargar modelos
ollama pull gemma3:4b
ollama pull embeddinggemma:latest

# 3. En .env
LLM_PROVIDER=ollama
OLLAMA_URL=http://localhost:11434
OLLAMA_CHAT_MODEL=gemma3:4b
OLLAMA_EMBEDDING_MODEL=embeddinggemma:latest
```

El cambio es **automático** al reiniciar el servidor. No requiere cambios en el código.

**⚠️ Nota sobre dimensiones de embeddings:**
- **OpenAI** (`text-embedding-3-small`): 1536 dimensiones
- **Ollama** (`embeddinggemma`): 768 dimensiones

Si cambias de provider, debes limpiar los documentos vectorizados existentes:
```bash
# Limpiar vectores con dimensiones incompatibles
npx prisma migrate reset --force
```

## 🔗 Enlaces Clickeables en Respuestas

Las respuestas del chatbot incluyen enlaces directos a los documentos fuente:

```
Usuario: "¿Cuál es el presupuesto?"
IA: "El presupuesto es de $500,000 según la página 3
     (fuente: [Presupuesto_2024.pdf](https://drive.google.com/file/d/abc123/view))"
```

**Soporte:**
- 📄 Google Drive → `https://drive.google.com/file/d/{fileId}/view`
- 📦 Dropbox → `https://www.dropbox.com/home{path}`
- ☁️ OneDrive → `https://onedrive.live.com/?id={fileId}`
- 💾 Local → `/api/files/{filename}`

**Frontend:** Renderiza con Markdown para convertir enlaces en clickeables.

## 🐛 Troubleshooting

### Error: "expected 1536 dimensions, not 768" (o viceversa)

Este error ocurre cuando cambias de provider con vectores existentes en la BD:

**Solución 1 - Verificar dimensiones:**
```bash
npm run check-dimensions
```

**Solución 2 - Limpiar vectores:**
```bash
npx prisma migrate reset --force
```

Luego vuelve a procesar tus documentos con el provider actual.

### Error: "pgvector extension not found"
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### Error: "Cannot connect to database"
Verifica que PostgreSQL esté corriendo:
```bash
docker-compose ps
```

### Error: "OpenAI API error"
Verifica tu API key y créditos en [platform.openai.com](https://platform.openai.com)

### Error de compilación
```bash
rm -rf node_modules dist
npm install
npm run build
```

### Sincronización RAG: "Heap out of memory" o proceso muy lento

La sincronización procesa archivos en lotes (12 por ejecución) y limita los logs en memoria para evitar OOM. Si tienes muchas carpetas o PDFs muy grandes:

- **Aumentar memoria de Node** (desarrollo local):
  ```bash
  NODE_OPTIONS=--max-old-space-size=4096 npm run dev
  ```
  O para una sola ejecución del servidor: `export NODE_OPTIONS=--max-old-space-size=4096` antes de `npm start`.

- **Formatos soportados:** Solo se indexan PDF, DOCX, DOC, TXT y XLSX. Imágenes (.jpg, .png) y otros formatos se omiten con un aviso.
- **PDFs sin texto:** Los PDFs escaneados (solo imagen) no contienen texto extraíble; se marcan como error y no se reintentan.
- **Mismo nombre en varias carpetas:** Si dos archivos tienen el mismo nombre, solo se indexa el primero; el otro queda con mensaje "Ya existe un archivo con el mismo nombre indexado".

## 📝 Crear Usuario Admin

```bash
# Local
npm run make-admin -- tu-email@ejemplo.com

# Railway
railway run npm run make-admin -- tu-email@ejemplo.com
```

## 🔄 Auto-Refresh de Tokens OAuth

El sistema automáticamente refresca tokens expirados:
- Detecta error 401
- Usa `refreshToken` + `clientId` + `clientSecret`
- Obtiene nuevo `accessToken`
- Reintenta la operación
- Actualiza credenciales en BD

## 📦 Roadmap

- [x] Multi-provider LLM (OpenAI/Ollama)
- [x] Enlaces clickeables a documentos fuente
- [x] Resumen de documento completo
- [ ] Soporte para Claude, Gemini, etc.
- [ ] Cache de embeddings
- [ ] Webhooks para sincronización automática
- [ ] Preview de documentos en modal
- [ ] Map-Reduce para documentos grandes

## 🤝 Contribuir

1. Fork el proyecto
2. Crea tu feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push al branch (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

ISC

## 🆘 Soporte

- 📖 [Guía de Deploy en Railway](./RAILWAY_DEPLOY.md)
- 🚀 [Quick Start Railway](./RAILWAY_QUICK_START.md)
- 📧 Contacto: [tu-email]

---

**Hecho con ❤️ usando TypeScript, Prisma y OpenAI**

