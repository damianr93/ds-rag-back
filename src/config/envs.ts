import 'dotenv/config';
import { get } from 'env-var';

export const envs = {
  // Server
  PORT: get('PORT').required().asPortNumber(),
  BACKEND_URL: get('BACKEND_URL').default('http://localhost:3000').asString(),
  FRONTEND_URL: get('FRONTEND_URL').default('http://localhost:5173').asString(),
  
  // Security
  JWT_SEED: get('JWT_SEED').required().asString(),
  ENCRYPTION_KEY: get('ENCRYPTION_KEY').required().asString(),
  X_TOKEN_API: get('X_TOKEN_API').default('').asString(), // Opcional - para reset password

  // PostgreSQL
  // Railway provee DATABASE_URL, estas variables son opcionales si DATABASE_URL existe
  DATABASE_URL: get('DATABASE_URL').asString(),
  PG_HOST: get('PG_HOST').default('').asString(),
  PG_PORT: get('PG_PORT').default(5432).asPortNumber(),
  PG_USER: get('PG_USER').default('').asString(),
  PG_PASSWORD: get('PG_PASSWORD').default('').asString(),
  PG_DB: get('PG_DB').default('').asString(),
  TABLE_VECTOR: get('TABLE_VECTOR').default('document_vectors').asString(),
  COL_TEXT: get('COL_TEXT').default('text').asString(),
  COL_SOURCE: get('COL_SOURCE').default('source').asString(),

  LLM_PROVIDER: get('LLM_PROVIDER').default('openai').asString(),

  OPENAI_API_KEY: get('OPENAI_API_KEY').default('').asString(),
  OPENAI_CHAT_MODEL: get('OPENAI_CHAT_MODEL').default('gpt-4o-mini').asString(),
  OPENAI_EMBEDDING_MODEL: get('OPENAI_EMBEDDING_MODEL').default('text-embedding-3-small').asString(),

  OLLAMA_URL: get('OLLAMA_URL').default('http://localhost:11434').asString(),
  OLLAMA_CHAT_MODEL: get('OLLAMA_CHAT_MODEL').default('llama3.2').asString(),
  OLLAMA_EMBEDDING_MODEL: get('OLLAMA_EMBEDDING_MODEL').default('nomic-embed-text').asString(),
}





