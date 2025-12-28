import path from 'path';
import fs from 'fs/promises';
import { createHash } from 'crypto';
import { tmpdir } from 'os';

import { ConversationMessage, ProcessResult } from '../dto/rag.dto';
import { ConversationRepository, DocumentVectorRepository, ProcessedFileRepository } from '../../domain/rag/ports/repositories';
import { Chunker, EmbeddingsProvider } from '../../domain/rag/ports/services';
import { ChatLLM } from '../../domain/shared/ports/llm';
import { TextExtractorRegistry } from '../../infrastructure/rag/extractors/registry';
import { DocumentSourceRepository } from '../../domain/document-sources/ports/repositories';
import { CloudStorageProvider } from '../../domain/document-sources/ports/services';
import { EncryptionService } from '../services/encryption.service';
import { DocumentSourceCredentials } from '../../domain/entities/document-source.entity';

export class RAGApplication {
  private encryptionService?: EncryptionService;

  constructor(
    private readonly convoRepo: ConversationRepository,
    private readonly docRepo: DocumentVectorRepository,
    private readonly fileRepo: ProcessedFileRepository,
    private readonly embeddings: EmbeddingsProvider,
    private readonly chat: ChatLLM,
    private readonly chunker: Chunker,
    private readonly documentSourceRepo?: DocumentSourceRepository,
    private readonly googleDriveProvider?: CloudStorageProvider,
    private readonly dropboxProvider?: CloudStorageProvider,
    private readonly oneDriveProvider?: CloudStorageProvider,
    encryptionKey?: string,
  ) {
    if (encryptionKey) {
      this.encryptionService = new EncryptionService(encryptionKey);
    }
  }

  private buildOptimizerPrompt(currentQuestion: string, conversationHistory: ConversationMessage[]) {
    const recentHistory = conversationHistory.slice(-6);
    const contextMessages = recentHistory.map(m => `${m.role}: ${m.content}`).join('\n');
    const messages = [
      {
        role: 'system' as const,
        content: `Eres un optimizador de consultas para búsqueda vectorial semántica. Tu ÚNICA función es transformar la consulta del usuario en una versión optimizada.

REGLAS ESTRICTAS:
- Responde ÚNICAMENTE con el string de búsqueda optimizado
- NO agregues introducciones, explicaciones o comentarios
- NO uses frases como "aquí tienes", "la consulta optimizada es"
- Combina el contexto conversacional con la pregunta específica
- Expande términos vagos con contexto de la conversación
- Mantén palabras clave técnicas importantes
- Elimina palabras de relleno pero conserva el significado semántico
- Si la pregunta es muy específica pero el contexto da más información, enriquécela
- IMPORTANTE: Revise muy criticamente el contexto de conversacion, y si detectas que el usuario hizo una repregunta sobre un tema anterior el string de busqueda debe reflejar justamente esa busqueda.

EJEMPLOS:
Contexto: discusión sobre fútbol → Pregunta: "¿y los goles?" → Respuesta: "estadísticas goles fútbol partidos marcadores"
Contexto: programación Python → Pregunta: "¿cómo optimizar?" → Respuesta: "optimización rendimiento código Python técnicas algoritmos"
Contexto: recetas cocina → Pregunta: "sin gluten" → Respuesta: "recetas sin gluten celíacos ingredientes alternativos harina"`
      },
      {
        role: 'user' as const,
        content: `CONTEXTO DE CONVERSACIÓN:\n${contextMessages}\n\nPREGUNTA ACTUAL:\n${currentQuestion}`,
      },
    ];
    return messages;
  }

  private cleanOptimizerResponse(response: string, fallback: string): string {
    const cleaned = response
      .replace(/^(la consulta optimizada es|aquí tienes|respuesta:|optimizada:)/i, '')
      .replace(/^[["\s]+|["\s]+$/g, '')
      .replace(/\n/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (cleaned.length < 3 || cleaned.toLowerCase().includes('no puedo')) {
      return this.basicQueryCleanup(fallback);
    }

    return cleaned;
  }

  private basicQueryCleanup(query: string): string {
    return query
      .replace(/[¿?¡!]/g, '')
      .replace(/\b(cómo|qué|cuál|cuáles|dónde|cuándo|por qué|para qué)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  async askWithRAG(question: string, conversationId: number, userId: number): Promise<{ content: string }> {
    const history = await this.convoRepo.getHistory(conversationId);
    const optimizerMessages = this.buildOptimizerPrompt(question, history);
    let optimized = '';
    try {
      const resp = await this.chat.chat(optimizerMessages);
      optimized = this.cleanOptimizerResponse(resp, question);
    } catch {
      optimized = this.basicQueryCleanup(question);
    }

    const embed = await this.embeddings.generateEmbedding(optimized);
    const similar = await this.docRepo.findSimilar(embed, 5);
    const context = similar.map(d => `- ${d.text} (fuente: ${d.source})`).join('\n\n');

    const recentHistory = history.slice(-10).map(m => ({ role: m.role, content: m.content })) as any[];
    const messages: any[] = [
      {
        role: 'system',
        content: `
Eres un asistente experto en análisis documental que utiliza RAG (Retrieval Augmented Generation).

OBJETIVO:
- Ayudar al usuario a responder preguntas usando únicamente la información provista en el CONTEXTO.
- Si la respuesta no está en el CONTEXTO, guiar al usuario para reformular la pregunta y obtener mejor información.

REGLAS IMPORTANTES:
1. Usa el CONTEXTO recuperado para responder, y si no es suficiente dialoga con el usuario para guiarlo a una mejor consulta que traiga un mejor contexto.
2. No inventes información.
3. Si no hay suficiente información, ofrece al usuario una o varias preguntas de aclaración
   o palabras clave alternativas que podrían mejorar la búsqueda.
4. Mantén consistencia con el historial de conversación.
5. Responde en español claro, conciso y estructurado.
6. Siempre cita la fuente entre paréntesis al final de cada fragmento relevante (ejemplo: fuente: archivo.pdf).
7. Si el CONTEXTO incluye múltiples fuentes, integra y compara la información.
8. Si el usuario hace una pregunta ambigua, pide que la precise.
9. Si el usuario saluda con un hola, o pregunta cosas que no estan en el contexto, presentate y explicale tu rol aclarando que no hay informacion en el RAG sobre su consulta, pero que en base a tu conocimiento como LLM podes darle una respuesta (cuando sea el caso)
10. IMPORTANTE: Analiza la recentHistory para discernir a que se refiere el usuario con la ultima pregunta, para responder consistentemente.

FORMATO DE RESPUESTA:
- Si la respuesta es breve: un párrafo claro.
- Si la respuesta es extensa o compleja: usa viñetas o subtítulos.
- Si no encontrás suficiente información: responde en dos pasos:
   a) "No encontré información suficiente en los documentos para responder con certeza."
   b) Formula inmediatamente una pregunta aclaratoria o sugiere reformulaciones.
        `,
      },
      ...recentHistory,
    ];

    if (context.length < 300) {
      messages.push({
        role: 'user',
        content: `No se encontró suficiente contexto en los documentos para la pregunta actual.\nPregunta original: "${question}"\n\nAyuda al usuario a refinar su consulta sugiriendo posibles interpretaciones, palabras clave o temas relacionados que podrían mejorar la búsqueda.`,
      });
    } else {
      messages.push({
        role: 'user',
        content: `CONTEXTO:\n${context}\n\nPREGUNTA:\n${question}`,
      });
    }

    const assistantResponse = await this.chat.chat(messages);
    await this.convoRepo.saveMessage(conversationId, 'user', question);
    await this.convoRepo.saveMessage(conversationId, 'assistant', assistantResponse);
    return { content: assistantResponse };
  }

  async createConversation(userId: number, title: string): Promise<number> {
    return this.convoRepo.create(userId, title);
  }

  async getConversationHistory(conversationId: number) {
    return this.convoRepo.getHistory(conversationId);
  }

  async getUserConversations(userId: number) {
    return this.convoRepo.listActiveByUser(userId);
  }

  async generateEmbedding(text: string): Promise<number[]> {
    return this.embeddings.generateEmbedding(text);
  }

  async searchSimilarDocuments(embedding: number[], k = 5): Promise<string[]> {
    const docs = await this.docRepo.findSimilar(embedding, k);
    return docs.map(d => `- ${d.text} (fuente: ${d.source})`);
  }

  async deactivateConversation(conversationId: number): Promise<boolean> {
    return this.convoRepo.deactivate(conversationId);
  }

  async processFile(filePath: string): Promise<ProcessResult> {
    const filename = path.basename(filePath);
    const fileBuffer = await fs.readFile(filePath);
    const hash = createHash('md5').update(fileBuffer.toString('binary')).digest('hex');

    if (await this.fileRepo.exists(filename, hash)) {
      return { success: false, message: `El archivo ${filename} ya fue procesado anteriormente` };
    }

    const extractor = new TextExtractorRegistry().getExtractor(filePath);
    const text = await extractor.extract(filePath);
    if (text.trim().length === 0) return { success: false, message: `El archivo ${filename} no contiene texto extraíble` };

    const chunks = this.chunker.chunk(text);
    let index = 1;
    for (const chunk of chunks) {
      const emb = await this.embeddings.generateEmbedding(chunk);
      await this.docRepo.insertChunk({
        text: chunk,
        embedding: emb,
        source: filename,
        chunkIndex: index,
        totalChunks: chunks.length,
      });
      index++;
    }

    await this.fileRepo.insert(filename, hash, chunks.length);
    return { success: true, message: `Archivo ${filename} procesado exitosamente`, chunksCount: chunks.length };
  }

  async processDirectory(directoryPath: string, extensions: string[] = ['.pdf', '.docx', '.doc', '.txt']) {
    const files = await fs.readdir(directoryPath);
    const supportedFiles = files.filter((f) => extensions.includes(path.extname(f).toLowerCase()))
      .map((f) => path.join(directoryPath, f));
    if (supportedFiles.length === 0) return { processed: 0, skipped: 0, errors: 0, details: ['No se encontraron archivos soportados'] };

    let processed = 0, skipped = 0, errors = 0; const details: string[] = [];
    for (const file of supportedFiles) {
      try {
        const result = await this.processFile(file);
        if (result.success) { processed++; details.push(`✅ ${path.basename(file)}: ${result.chunksCount} chunks`); }
        else if (result.message.includes('ya fue procesado')) { skipped++; details.push(`⏭️ ${path.basename(file)}: ya procesado`); }
        else { errors++; details.push(`❌ ${path.basename(file)}: ${result.message}`); }
      } catch (e: any) {
        errors++; details.push(`❌ ${path.basename(file)}: ${e?.message ?? 'Error desconocido'}`);
      }
    }
    return { processed, skipped, errors, details };
  }

  async getStats() {
    const [files, totalChunks] = await Promise.all([
      this.fileRepo.listFiles(),
      this.docRepo.countAll(),
    ]);
    return { totalFiles: files.length, totalChunks, files };
  }

  async clearDatabase(): Promise<void> {
    await this.docRepo.clearAll();
    await this.fileRepo.clearAll();
  }

  async updateConversationTitle(conversationId: number, userId: number, title: string): Promise<void> {
    await this.convoRepo.updateTitle(conversationId, userId, title);
  }

  async processFileFromSource(userId: number, sourceId: number, fileId: string, fileName?: string): Promise<ProcessResult> {
    if (!this.documentSourceRepo || !this.googleDriveProvider || !this.dropboxProvider || !this.oneDriveProvider) {
      return { success: false, message: 'Document sources not configured' };
    }

    // Obtener la fuente
    const source = await this.documentSourceRepo.findById(sourceId);
    if (!source || source.userId !== userId || !source.isActive) {
      return { success: false, message: 'Source not found or inactive' };
    }

    // Obtener el provider correcto
    let provider: CloudStorageProvider;
    switch (source.provider) {
      case 'google_drive':
        provider = this.googleDriveProvider;
        break;
      case 'dropbox':
        provider = this.dropboxProvider;
        break;
      case 'onedrive':
        provider = this.oneDriveProvider;
        break;
      default:
        return { success: false, message: `Unknown provider: ${source.provider}` };
    }

    // Desencriptar credenciales
    if (!this.encryptionService) {
      return { success: false, message: 'Encryption service not configured' };
    }
    const credentials = this.encryptionService.decryptJSON<DocumentSourceCredentials>(source.credentials);

    // Obtener metadata del archivo para determinar tipo
    const metadata = await provider.getFileMetadata(credentials, fileId);
    
    // Descargar el archivo
    const fileBuffer = await provider.downloadFile(credentials, fileId);
    const hash = createHash('md5').update(fileBuffer).digest('hex');
    
    // Determinar el nombre y extensión correcta
    let filename = fileName || metadata.name || fileId;
    
    // Si es un Google Doc/Sheet/Slide, se exporta como PDF
    if (metadata.mimeType.startsWith('application/vnd.google-apps.')) {
      // Agregar extensión .pdf si no la tiene
      if (!filename.toLowerCase().endsWith('.pdf')) {
        filename = `${filename}.pdf`;
      }
    }

    // ✅ Sanitizar el nombre del archivo para evitar problemas con rutas
    const sanitizedFilename = this.sanitizeFilename(filename);

    // Verificar si ya fue procesado
    if (await this.fileRepo.exists(sanitizedFilename, hash)) {
      return { success: false, message: `El archivo ${filename} ya fue procesado anteriormente` };
    }

    // Guardar temporalmente con nombre sanitizado
    const tempPath = path.join(tmpdir(), `${Date.now()}-${sanitizedFilename}`);
    await fs.writeFile(tempPath, fileBuffer);

    try {
      // Extraer texto
      const extractor = new TextExtractorRegistry().getExtractor(tempPath);
      const text = await extractor.extract(tempPath);
      
      if (text.trim().length === 0) {
        return { success: false, message: `El archivo ${filename} no contiene texto extraíble` };
      }

      // Procesar chunks
      const chunks = this.chunker.chunk(text);
      let index = 1;
      for (const chunk of chunks) {
        const emb = await this.embeddings.generateEmbedding(chunk);
        await this.docRepo.insertChunk({
          text: chunk,
          embedding: emb,
          source: sanitizedFilename, // ✅ Usar nombre sanitizado
          chunkIndex: index,
          totalChunks: chunks.length,
        });
        index++;
      }

      await this.fileRepo.insert(sanitizedFilename, hash, chunks.length); // ✅ Usar nombre sanitizado
      return { success: true, message: `Archivo ${filename} procesado exitosamente`, chunksCount: chunks.length };
    } finally {
      // Limpiar archivo temporal
      try {
        await fs.unlink(tempPath);
      } catch (error) {
        console.error('Error deleting temp file:', error);
      }
    }
  }

  /**
   * Sanitiza un nombre de archivo removiendo caracteres inválidos
   * que pueden causar problemas en el sistema de archivos
   */
  private sanitizeFilename(filename: string): string {
    // Caracteres prohibidos en nombres de archivo: / \ : * ? " < > |
    // Reemplazarlos por guión bajo
    return filename
      .replace(/[/\\:*?"<>|]/g, '_')  // Reemplazar caracteres inválidos
      .replace(/\s+/g, '_')             // Reemplazar múltiples espacios por un guión bajo
      .replace(/_+/g, '_')              // Evitar múltiples guiones bajos consecutivos
      .trim();                          // Eliminar espacios al inicio/final
  }
}
