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
  PG_HOST: get('PG_HOST').required().asString(),
  PG_PORT: get('PG_PORT').required().asPortNumber(),
  PG_USER: get('PG_USER').required().asString(),
  PG_PASSWORD: get('PG_PASSWORD').required().asString(),
  PG_DB: get('PG_DB').required().asString(),
  TABLE_VECTOR: get('TABLE_VECTOR').required().asString(),
  COL_TEXT: get('COL_TEXT').required().asString(),
  COL_SOURCE: get('COL_SOURCE').required().asString(),

  // OpenAI (LLM & Embeddings)
  OPENAI_API_KEY: get('OPENAI_API_KEY').required().asString(),
  OPENAI_CHAT_MODEL: get('OPENAI_CHAT_MODEL').default('gpt-4o-mini').asString(),
  OPENAI_EMBEDDING_MODEL: get('OPENAI_EMBEDDING_MODEL').default('text-embedding-3-small').asString(),

  /* OLLAMA - Deshabilitado por ahora (descomentar si quieres volver a usarlo)
  LLM_PROVIDER: get('LLM_PROVIDER').default('openai').asString(),
  OLLAMA_URL: get('OLLAMA_URL').default('http://localhost:11434').asString(),
  MODEL: get('MODEL').default('llama3.2').asString(),
  EMBEDDING_MODEL: get('EMBEDDING_MODEL').default('nomic-embed-text').asString(),
  */
}





