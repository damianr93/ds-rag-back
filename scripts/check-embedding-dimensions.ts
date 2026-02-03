import { envs } from '../src/config';
import { OllamaEmbeddingsProvider } from '../src/infrastructure/rag/providers/ollama-embeddings.provider';
import { OpenAIEmbeddingsProvider } from '../src/infrastructure/rag/providers/openai-embeddings.provider';

async function checkEmbeddingDimensions() {
  console.log('🔍 Verificando dimensiones de embeddings...\n');
  
  const provider = envs.LLM_PROVIDER.toLowerCase();
  
  try {
    let dimensions: number;
    
    if (provider === 'ollama') {
      console.log(`Provider: Ollama`);
      console.log(`Modelo: ${envs.OLLAMA_EMBEDDING_MODEL}`);
      console.log(`URL: ${envs.OLLAMA_URL}\n`);
      
      const embeddingProvider = new OllamaEmbeddingsProvider(envs.OLLAMA_URL, envs.OLLAMA_EMBEDDING_MODEL);
      const testEmbedding = await embeddingProvider.generateEmbedding('test');
      dimensions = testEmbedding.length;
      
      console.log(`✅ Dimensiones detectadas: ${dimensions}`);
      
      if (dimensions === 768) {
        console.log('✅ Compatible con schema actual (vector(768))');
      } else if (dimensions === 1536) {
        console.log('⚠️  El modelo genera 1536 dimensiones pero el schema está en 768');
        console.log('   Ejecuta: npx prisma migrate dev --name change_to_1536');
      } else {
        console.log(`⚠️  Dimensiones no estándar: ${dimensions}`);
        console.log('   Necesitas actualizar el schema de Prisma manualmente');
      }
      
    } else if (provider === 'openai') {
      console.log(`Provider: OpenAI`);
      console.log(`Modelo: ${envs.OPENAI_EMBEDDING_MODEL}\n`);
      
      const embeddingProvider = new OpenAIEmbeddingsProvider(envs.OPENAI_API_KEY, envs.OPENAI_EMBEDDING_MODEL);
      const testEmbedding = await embeddingProvider.generateEmbedding('test');
      dimensions = testEmbedding.length;
      
      console.log(`✅ Dimensiones detectadas: ${dimensions}`);
      
      if (dimensions === 1536) {
        console.log('⚠️  El modelo genera 1536 dimensiones pero el schema está en 768');
        console.log('   Ejecuta: npx prisma migrate dev --name change_to_1536');
      } else if (dimensions === 768) {
        console.log('✅ Compatible con schema actual (vector(768))');
      } else {
        console.log(`⚠️  Dimensiones no estándar: ${dimensions}`);
        console.log('   Necesitas actualizar el schema de Prisma manualmente');
      }
    } else {
      console.log(`❌ Provider no soportado: ${provider}`);
      process.exit(1);
    }
    
    console.log('\n💡 Tip: Si las dimensiones no coinciden, limpia los vectores existentes:');
    console.log('   npx prisma migrate reset --force');
    
  } catch (error: any) {
    console.error('❌ Error al verificar dimensiones:', error.message);
    process.exit(1);
  }
}

checkEmbeddingDimensions();
