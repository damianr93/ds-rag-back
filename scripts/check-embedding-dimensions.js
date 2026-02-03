"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("../src/config");
const ollama_embeddings_provider_1 = require("../src/infrastructure/rag/providers/ollama-embeddings.provider");
const openai_embeddings_provider_1 = require("../src/infrastructure/rag/providers/openai-embeddings.provider");
function checkEmbeddingDimensions() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('🔍 Verificando dimensiones de embeddings...\n');
        const provider = config_1.envs.LLM_PROVIDER.toLowerCase();
        try {
            let dimensions;
            if (provider === 'ollama') {
                console.log(`Provider: Ollama`);
                console.log(`Modelo: ${config_1.envs.OLLAMA_EMBEDDING_MODEL}`);
                console.log(`URL: ${config_1.envs.OLLAMA_URL}\n`);
                const embeddingProvider = new ollama_embeddings_provider_1.OllamaEmbeddingsProvider(config_1.envs.OLLAMA_URL, config_1.envs.OLLAMA_EMBEDDING_MODEL);
                const testEmbedding = yield embeddingProvider.generateEmbedding('test');
                dimensions = testEmbedding.length;
                console.log(`✅ Dimensiones detectadas: ${dimensions}`);
                if (dimensions === 768) {
                    console.log('✅ Compatible con schema actual (vector(768))');
                }
                else if (dimensions === 1536) {
                    console.log('⚠️  El modelo genera 1536 dimensiones pero el schema está en 768');
                    console.log('   Ejecuta: npx prisma migrate dev --name change_to_1536');
                }
                else {
                    console.log(`⚠️  Dimensiones no estándar: ${dimensions}`);
                    console.log('   Necesitas actualizar el schema de Prisma manualmente');
                }
            }
            else if (provider === 'openai') {
                console.log(`Provider: OpenAI`);
                console.log(`Modelo: ${config_1.envs.OPENAI_EMBEDDING_MODEL}\n`);
                const embeddingProvider = new openai_embeddings_provider_1.OpenAIEmbeddingsProvider(config_1.envs.OPENAI_API_KEY, config_1.envs.OPENAI_EMBEDDING_MODEL);
                const testEmbedding = yield embeddingProvider.generateEmbedding('test');
                dimensions = testEmbedding.length;
                console.log(`✅ Dimensiones detectadas: ${dimensions}`);
                if (dimensions === 1536) {
                    console.log('⚠️  El modelo genera 1536 dimensiones pero el schema está en 768');
                    console.log('   Ejecuta: npx prisma migrate dev --name change_to_1536');
                }
                else if (dimensions === 768) {
                    console.log('✅ Compatible con schema actual (vector(768))');
                }
                else {
                    console.log(`⚠️  Dimensiones no estándar: ${dimensions}`);
                    console.log('   Necesitas actualizar el schema de Prisma manualmente');
                }
            }
            else {
                console.log(`❌ Provider no soportado: ${provider}`);
                process.exit(1);
            }
            console.log('\n💡 Tip: Si las dimensiones no coinciden, limpia los vectores existentes:');
            console.log('   npx prisma migrate reset --force');
        }
        catch (error) {
            console.error('❌ Error al verificar dimensiones:', error.message);
            process.exit(1);
        }
    });
}
checkEmbeddingDimensions();
