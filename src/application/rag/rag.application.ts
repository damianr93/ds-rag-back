import path from 'path';
import fs from 'fs/promises';
import { createHash } from 'crypto';
import { tmpdir } from 'os';

import { ConversationMessage, ProcessResult } from '../dto/rag.dto';
import { ConversationRepository, DocumentVectorRepository, ProcessedFileRepository } from '../../domain/rag/ports/repositories';
import { Chunker, EmbeddingsProvider } from '../../domain/rag/ports/services';
import { ChatLLM } from '../../domain/shared/ports/llm';
import { isSupportedExtension, TextExtractorRegistry } from '../../infrastructure/rag/extractors/registry';
import { DocumentSourceRepository } from '../../domain/document-sources/ports/repositories';
import { CloudStorageProvider } from '../../domain/document-sources/ports/services';
import { EncryptionService } from '../services/encryption.service';
import { DocumentSourceCredentials } from '../../domain/entities/document-source.entity';
import { SourceUrlGenerator } from '../../infrastructure/rag/utils/source-url-generator';

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
        content: `Eres un optimizador de consultas para búsqueda vectorial semántica en documentos corporativos.

TU ÚNICA FUNCIÓN:
Transformar la pregunta del usuario en palabras clave optimizadas para búsqueda semántica.

REGLAS OBLIGATORIAS:
- Responde SOLO con palabras clave en español, separadas por espacios
- NO añadas frases completas, introducciones o explicaciones
- Mantén términos técnicos y nombres específicos exactamente como aparecen
- Si hay contexto previo de conversación, combínalo con la pregunta actual
- Si detectas una repregunta (ej: "¿y eso?", "¿cuánto?"), usa el tema del contexto anterior
- Elimina palabras de relleno: "qué", "cómo", "dónde", "cuándo", "por qué"
- Expande siglas y acrónimos si el contexto lo sugiere

EJEMPLOS CORRECTOS:
"¿Qué son los EQL?" → "EQL definición significado"
"¿Cuántos días de vacaciones tengo?" → "días vacaciones beneficios empleado"
"¿Y el presupuesto?" (contexto: marketing) → "presupuesto marketing asignación costos"
"¿Cómo funciona el sistema?" → "sistema funcionamiento operación proceso"

EJEMPLOS INCORRECTOS:
❌ "La consulta optimizada es: EQL definición"
❌ "Aquí tienes las palabras clave: vacaciones días"
❌ "Para responder sobre EQL necesitas buscar..."`,
      },
      {
        role: 'user' as const,
        content: `CONTEXTO DE CONVERSACIÓN RECIENTE:\n${contextMessages}\n\nPREGUNTA ACTUAL DEL USUARIO:\n${currentQuestion}`,
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
    
    if (fallback.toLowerCase().includes('de que') || 
        fallback.toLowerCase().includes('de qué') || 
        fallback.toLowerCase().includes('contame') ||
        fallback.toLowerCase().includes('explicame')) {
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
    
    const lowerQuestion = question.toLowerCase();
    const wantsFullDocument = 
      lowerQuestion.includes('documento completo') || 
      lowerQuestion.includes('resumen del documento') ||
      lowerQuestion.includes('resumen completo') ||
      lowerQuestion.includes('todo el documento') ||
      lowerQuestion.includes('documento entero') ||
      lowerQuestion.includes('dame un resumen') ||
      lowerQuestion.includes('resumen de') ||
      lowerQuestion.includes('qué dice') ||
      lowerQuestion.includes('que dice') ||
      lowerQuestion.includes('de que habla') ||
      lowerQuestion.includes('de qué habla') ||
      lowerQuestion.includes('de que trata') ||
      lowerQuestion.includes('de qué trata') ||
      lowerQuestion.includes('sobre que trata') ||
      lowerQuestion.includes('sobre qué trata') ||
      lowerQuestion.includes('contame') ||
      lowerQuestion.includes('cuéntame') ||
      lowerQuestion.includes('explicame') ||
      lowerQuestion.includes('explícame') ||
      (lowerQuestion.includes('resumen') && (lowerQuestion.includes('documento') || lowerQuestion.includes('ese') || lowerQuestion.includes('este') || lowerQuestion.includes('eso')));
    
    const isComparison = lowerQuestion.includes('compar') || lowerQuestion.includes('diferencia') || lowerQuestion.includes('versus') || lowerQuestion.includes('vs');
    
    let k = 10;
    if (wantsFullDocument) k = 15;
    else if (isComparison) k = 12;
    else if (lowerQuestion.length > 100) k = 10;
    
    const similar = await this.docRepo.findSimilar(embed, k);

    let context = '';
    let documentContext = '';
    
    if (wantsFullDocument && similar.length > 0) {
      const targetSource = similar[0].source;
      const sourceLink = SourceUrlGenerator.formatSourceWithLink(
        similar[0].source, 
        similar[0].sourceUrl, 
        similar[0].sourceType
      );
      const allChunks = await this.docRepo.getAllChunksBySource(targetSource);
      
      if (allChunks.length <= 30) {
        context = `DOCUMENTO COMPLETO: ${sourceLink}\n\n` + 
          allChunks.map((c, idx) => `--- Sección ${idx + 1} ---\n${c.text}`).join('\n\n');
        documentContext = `Documento completo con todas sus ${allChunks.length} secciones.`;
      } else {
        const chunkText = allChunks.map((c, idx) => `--- Sección ${idx + 1} ---\n${c.text}`).join('\n\n');
        const previewText = chunkText.substring(0, 25000);
        context = `DOCUMENTO: ${sourceLink}\n(Mostrando las primeras ~${Math.min(30, allChunks.length)} secciones más relevantes de ${allChunks.length} totales)\n\n${previewText}`;
        documentContext = `Documento extenso con ${allChunks.length} secciones. Mostrando las más importantes.`;
      }
    } else if (isComparison && similar.length > 1) {
      const sources = [...new Set(similar.map(d => d.source))];
      context = sources.map(source => {
        const chunks = similar.filter(d => d.source === source);
        const link = SourceUrlGenerator.formatSourceWithLink(source, chunks[0].sourceUrl, chunks[0].sourceType);
        return `DOCUMENTO: ${link}\n\n` + 
          chunks.map(c => c.text).join('\n\n') + '\n\n---\n\n';
      }).join('\n');
      documentContext = `Información de ${sources.length} documento(s) para comparar.`;
    } else {
      context = similar.map((d, idx) => {
        const link = SourceUrlGenerator.formatSourceWithLink(d.source, d.sourceUrl, d.sourceType);
        return `[Fragmento ${idx + 1}]\n${d.text}\n(fuente: ${link})`;
      }).join('\n\n---\n\n');
      documentContext = `${similar.length} fragmentos relevantes encontrados.`;
    }

    const recentHistory = history.slice(-10).map(m => ({ role: m.role, content: m.content })) as any[];
    const messages: any[] = [
      {
        role: 'system',
        content: `
Eres un asistente especializado en extracción y análisis de información técnica de documentos empresariales.

IDIOMA:
- SIEMPRE en ESPAÑOL, sin excepciones.

REGLA FUNDAMENTAL:
- Extraes y presentas SOLO información del CONTEXTO proporcionado
- Si NO está en el CONTEXTO: di claramente "No encontré información sobre [tema]"
- Nunca inventes, especules o uses conocimiento general

TU ESPECIALIDAD - EXTRACCIÓN EXHAUSTIVA:

Cuando recibes DOCUMENTO COMPLETO o MÚLTIPLES FRAGMENTOS:
✅ EXTRAE toda la información técnica, especificaciones, datos
✅ ORGANIZA en secciones claras con subtítulos
✅ USA VIÑETAS (•) para listar características, specs, pasos
✅ INCLUYE números, medidas, códigos, modelos tal cual aparecen
✅ PRESENTA la info, no solo describas que existe
✅ Si hay tablas o datos estructurados, recréalos en formato limpio
✅ Lee TODO el contexto de principio a fin antes de responder

❌ NO digas solo "el documento trata sobre..."
❌ NO resumas en una frase lo que debería ser una lista completa
❌ NO omitas detalles técnicos o especificaciones
❌ NO seas genérico cuando hay datos específicos
❌ NO uses frases como "según el fragmento", "fragmento X", "según los documentos proporcionados"
❌ NO te enfoques solo en un tema si el usuario pide resumen completo

ESTRUCTURA DE RESPUESTA EFECTIVA (con buen espaciado y legibilidad):

Para RESÚMENES:

## [Título del tema principal]

### [Subtema 1]

• Dato específico 1

• Dato específico 2

• Especificación técnica con números

### [Subtema 2]

• **Característica A:** valor/descripción

• **Característica B:** valor/descripción

### Especificaciones Técnicas

• **Modelo:** [código]

• **Medidas:** [valores]

• **Capacidad:** [número]

---

(fuente: [documento](url))

Para CONSULTAS ESPECÍFICAS:

- Respuesta directa y concisa con los datos encontrados

- Usa viñetas si hay múltiples items (con espaciado)

- Deja líneas en blanco entre grupos de información

- Cita la fuente

Para COMPARACIONES:
  ## Comparación entre [A] y [B]
  
  ### [Característica 1]
  • [A]: valor/descripción
  • [B]: valor/descripción
  
  ### [Característica 2]
  • [A]: valor/descripción
  • [B]: valor/descripción

CUANDO NO HAY INFO EXACTA PERO SÍ HAY DOCUMENTOS RELACIONADOS:

- Lista los documentos relacionados que podrían ayudar (con espaciado)

- Explica brevemente por qué podrían ser relevantes

- Pregunta si alguno le sirve o si quiere buscar algo más específico

- Nunca digas solo "no encontré información" si hay docs relacionados

CUANDO REALMENTE NO HAY NADA:

"No encontré documentos relacionados con tu búsqueda. Te sugiero verificar que los documentos relevantes fueron cargados."

FORMATO MARKDOWN (ESPACIADO Y LEGIBILIDAD):
- ## para títulos principales (seguido de línea en blanco)
- ### para subtítulos (seguido de línea en blanco)
- • para viñetas de lista (una por línea)
- **negrita** para términos clave
- SIEMPRE deja una línea en blanco entre secciones
- SIEMPRE deja una línea en blanco después de cada título
- SIEMPRE deja una línea en blanco entre grupos de viñetas
- Usa párrafos cortos (máximo 2-3 líneas cada uno)
- Separa conceptos diferentes con líneas en blanco
- Fuentes al final: (fuente: [nombre](url))
        `,
      },
      ...recentHistory,
    ];

    if (similar.length === 0) {
      messages.push({
        role: 'user',
        content: `SITUACIÓN: No hay documentos indexados en el sistema.

PREGUNTA DEL USUARIO: "${question}"

INSTRUCCIONES:
1. Responde en ESPAÑOL, tono amigable y conversacional
2. Di algo como: "Parece que todavía no hay documentos cargados en el sistema. Si sos administrador, podés agregar documentos desde el panel de sincronización. Si sos usuario, por favor contactá al equipo para que carguen la documentación necesaria."
3. Sé empático y útil
4. NO inventes información`,
      });
    } else if (context.length < 150) {
      const relatedDocs = similar.slice(0, 5).map(d => {
        const link = SourceUrlGenerator.formatSourceWithLink(d.source, d.sourceUrl, d.sourceType);
        const preview = d.text.length > 200 ? d.text.substring(0, 200) + '...' : d.text;
        return { source: d.source, link, preview };
      });

      const docsInfo = relatedDocs.map((doc, idx) => 
        `${idx + 1}. ${doc.link}\n   Vista previa: "${doc.preview}"`
      ).join('\n\n');

      messages.push({
        role: 'user',
        content: `SITUACIÓN: La búsqueda devolvió ${similar.length} documento(s), pero no parecen muy relacionados con "${question}".

DOCUMENTOS QUE LLEGARON A LA BÚSQUEDA:
${docsInfo}

INSTRUCCIONES PARA RESPONDER (tono conversacional y natural):
1. Responde en ESPAÑOL, como si fueras un bibliotecario experto y amigable
2. Inicia con: "No encontré información específica sobre [tema exacto], pero estos son los documentos más cercanos que tengo:"
3. Lista los documentos con hipervínculos usando formato Markdown
4. Para cada uno, menciona qué contiene según la vista previa
5. Pregunta al usuario: "¿Alguno de estos te sirve o se acerca a lo que buscás? Si no, podés probar con otros términos o contarme más sobre qué necesitás."
6. Si notás algún patrón o tema común en los documentos, mencionalo
7. NO digas "no encontré nada" cuando hay resultados - siempre mostrar lo que trajiste
8. NO inventes información - solo comenta sobre las vistas previas reales`,
      });
    } else if (similar.length > 0) {
      const instructionType = wantsFullDocument 
        ? `RESUMEN DE DOCUMENTO COMPLETO SOLICITADO`
        : isComparison 
        ? `COMPARACIÓN DE DOCUMENTOS`
        : `CONSULTA ESPECÍFICA`;
      
      let specificInstructions = '';
      if (wantsFullDocument) {
        specificInstructions = `
IMPORTANTE - RESUMEN COMPLETO SOLICITADO:

ESTRATEGIA OBLIGATORIA:
1. IGNORA la pregunta anterior del usuario - ahora quiere un RESUMEN COMPLETO
2. Lee TODO el contexto proporcionado de principio a fin
3. Organiza la información en secciones temáticas con ## (con espaciado)
4. EXTRAE cada punto relevante con viñetas • (una por línea)
5. Incluye TODOS los datos técnicos: modelos, números, medidas, especificaciones
6. Si hay listas de características, pónlas todas (con espaciado entre grupos)
7. Si hay tablas, recréalas en formato limpio (con líneas en blanco)
8. Si hay pasos o procedimientos, numéralos (con espaciado)
9. USA LÍNEAS EN BLANCO entre todas las secciones para mejor legibilidad

LO QUE NUNCA HAGAS:
❌ NO digas solo "el documento trata sobre..." - ESO NO ES UN RESUMEN
❌ NO te quedes en un tema - CUBRE TODO el documento
❌ NO omitas especificaciones técnicas
❌ NO uses frases como "según el fragmento X" o "fragmento Y"
❌ NO hagas un párrafo genérico - USA ESTRUCTURA con ## y •

FORMATO OBLIGATORIO:
## [Título principal del documento]

### [Primera sección temática]
• Punto específico 1
• Punto específico 2
• Dato técnico con números

### [Segunda sección temática]
• Característica A: descripción/valor
• Característica B: descripción/valor

[... continúa con TODAS las secciones relevantes ...]

(fuente: [documento](url))`;
      } else if (isComparison) {
        specificInstructions = `
IMPORTANTE - ESTRATEGIA DE COMPARACIÓN:
- Crea una comparación estructurada por categorías
- Identifica características en común y diferencias
- Usa formato de lista con • para cada característica
- Organiza por: especificaciones técnicas, funcionalidades, aplicaciones, etc.
- Si faltan datos de uno de los items, indícalo claramente`;
      } else {
        specificInstructions = `
IMPORTANTE - ESTRATEGIA DE RESPUESTA:
- Responde directamente la pregunta con los datos disponibles
- Si hay varios fragmentos con info relacionada, sintetiza todo
- Usa viñetas • cuando listes características o items
- Prioriza información específica y técnica`;
      }

      messages.push({
        role: 'user',
        content: `TIPO DE CONSULTA: ${instructionType}
${documentContext}

${specificInstructions}

CONTEXTO DE LOS DOCUMENTOS:
${context}

PREGUNTA DEL USUARIO:
${question}

INSTRUCCIONES GENERALES:
- Responde SOLO basándote en el CONTEXTO anterior
- Responde en ESPAÑOL siempre
- Cita las fuentes al final con el formato: (fuente: [nombre](url))
- NO inventes ni agregues información de tu conocimiento general
- Si piden resumen: EXTRAE y ORGANIZA toda la información relevante del contexto
- Usa formato Markdown: ## para títulos, • para listas, **negrita** para destacar`,
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
    return docs.map(d => {
      const link = SourceUrlGenerator.formatSourceWithLink(d.source, d.sourceUrl, d.sourceType);
      return `- ${d.text} (fuente: ${link})`;
    });
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
        sourceType: 'local',
        sourceUrl: undefined,
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

    const metadata = await provider.getFileMetadata(credentials, fileId);
    let filename = fileName || metadata.name || fileId;

    if (metadata.mimeType.startsWith('application/vnd.google-apps.')) {
      if (!filename.toLowerCase().endsWith('.pdf')) {
        filename = `${filename}.pdf`;
      }
    }

    if (!isSupportedExtension(filename)) {
      const ext = path.extname(filename).toLowerCase() || '(sin extensión)';
      return {
        success: false,
        message: `Formato no soportado (${ext}). Solo se indexan: PDF, DOCX, DOC, TXT, XLSX.`,
      };
    }

    const sanitizedFilename = this.sanitizeFilename(filename);

    if (await this.fileRepo.existsByFilename(sanitizedFilename)) {
      return {
        success: false,
        message: 'Ya existe un archivo con el mismo nombre indexado (posible duplicado en otra carpeta).',
      };
    }

    const fileBuffer = await provider.downloadFile(credentials, fileId);
    const hash = createHash('md5').update(fileBuffer).digest('hex');

    if (await this.fileRepo.exists(sanitizedFilename, hash)) {
      return { success: false, message: `El archivo ${filename} ya fue procesado anteriormente` };
    }

    const tempPath = path.join(tmpdir(), `${Date.now()}-${sanitizedFilename}`);
    await fs.writeFile(tempPath, fileBuffer);

    try {
      // Extraer texto
      const extractor = new TextExtractorRegistry().getExtractor(tempPath);
      const text = await extractor.extract(tempPath);
      
      if (text.trim().length === 0) {
        return {
          success: false,
          message: `El archivo no contiene texto extraíble (puede ser un PDF escaneado o solo imágenes). Solo se indexan documentos con texto seleccionable.`,
        };
      }

      const chunks = this.chunker.chunk(text);
      const sourceUrl = SourceUrlGenerator.generateUrl(fileId, source.provider, fileName || fileId);
      
      let index = 1;
      for (const chunk of chunks) {
        const emb = await this.embeddings.generateEmbedding(chunk);
        await this.docRepo.insertChunk({
          text: chunk,
          embedding: emb,
          source: sanitizedFilename,
          sourceUrl,
          sourceType: source.provider,
          chunkIndex: index,
          totalChunks: chunks.length,
        });
        index++;
      }

      try {
        await this.fileRepo.insert(sanitizedFilename, hash, chunks.length);
      } catch (err: unknown) {
        const isUniqueViolation =
          err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'P2002';
        if (isUniqueViolation) {
          await this.docRepo.deleteBySource(sanitizedFilename);
          return {
            success: false,
            message: 'Ya existe un archivo con el mismo nombre indexado (posible duplicado en otra carpeta).',
          };
        }
        throw err;
      }
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
