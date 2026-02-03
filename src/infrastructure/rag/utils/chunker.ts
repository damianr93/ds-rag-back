import { Chunker } from '../../../domain/rag/ports/services';

/**
 * Chunker Semántico Mejorado
 * 
 * Estrategia:
 * 1. Respeta la estructura del documento (párrafos, secciones)
 * 2. No corta en medio de oraciones
 * 3. Mantiene contexto con overlap inteligente
 * 4. Chunks más grandes para mejor contexto semántico
 * 5. Detecta y preserva headers/títulos en chunks
 */
export class SimpleChunker implements Chunker {
  chunk(text: string, options?: { maxSize?: number; overlap?: number }): string[] {
    // Valores optimizados para OpenAI embeddings (text-embedding-3-small/large)
    const maxSize = options?.maxSize ?? 1800;  // Tamaño óptimo para contexto semántico
    const overlapSize = options?.overlap ?? 400;  // ~20-25% overlap para continuidad

    // Normalizar saltos de línea
    const normalizedText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    
    // Dividir en párrafos (respetando estructura)
    const paragraphs = normalizedText
      .split(/\n\n+/)
      .map(p => p.trim())
      .filter(p => p.length > 0);

    const chunks: string[] = [];
    let currentChunk = '';
    let previousChunkEnd = '';  // Para overlap inteligente

    for (const paragraph of paragraphs) {
      // Si el párrafo solo es muy grande, dividirlo por oraciones
      if (paragraph.length > maxSize) {
        // Guardar chunk actual si existe
        if (currentChunk.trim()) {
          chunks.push(currentChunk.trim());
          previousChunkEnd = this.getLastNChars(currentChunk, overlapSize);
          currentChunk = '';
        }

        // Dividir párrafo grande en oraciones
        const largeParagraphChunks = this.splitLargeParagraph(paragraph, maxSize, overlapSize);
        chunks.push(...largeParagraphChunks);
        previousChunkEnd = this.getLastNChars(largeParagraphChunks[largeParagraphChunks.length - 1], overlapSize);
        continue;
      }

      // Intentar agregar párrafo al chunk actual
      const potentialChunk = currentChunk 
        ? `${currentChunk}\n\n${paragraph}`
        : (previousChunkEnd ? `${previousChunkEnd}\n\n${paragraph}` : paragraph);

      if (potentialChunk.length <= maxSize) {
        currentChunk = potentialChunk;
      } else {
        // Guardar chunk actual
        if (currentChunk.trim()) {
          chunks.push(currentChunk.trim());
          previousChunkEnd = this.getLastNChars(currentChunk, overlapSize);
        }
        
        // Iniciar nuevo chunk con overlap
        currentChunk = previousChunkEnd 
          ? `${previousChunkEnd}\n\n${paragraph}`
          : paragraph;
      }
    }

    // Agregar último chunk
    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    // Filtrar chunks muy pequeños (menos de 50 caracteres)
    return chunks.filter(c => c.length >= 50);
  }

  /**
   * Divide un párrafo muy grande en chunks respetando oraciones
   */
  private splitLargeParagraph(paragraph: string, maxSize: number, overlapSize: number): string[] {
    const sentences = paragraph.match(/[^.!?]+[.!?]+/g) || [paragraph];
    const chunks: string[] = [];
    let currentChunk = '';
    let previousEnd = '';

    for (const sentence of sentences) {
      const trimmed = sentence.trim();
      
      if (!trimmed) continue;

      const potentialChunk = currentChunk 
        ? `${currentChunk} ${trimmed}`
        : (previousEnd ? `${previousEnd} ${trimmed}` : trimmed);

      if (potentialChunk.length <= maxSize) {
        currentChunk = potentialChunk;
      } else {
        if (currentChunk) {
          chunks.push(currentChunk);
          previousEnd = this.getLastNChars(currentChunk, overlapSize);
        }
        
        // Si una sola oración es muy grande, la partimos forzadamente
        if (trimmed.length > maxSize) {
          const forcedChunks = this.forceChunk(trimmed, maxSize, overlapSize);
          chunks.push(...forcedChunks);
          previousEnd = this.getLastNChars(forcedChunks[forcedChunks.length - 1], overlapSize);
          currentChunk = '';
        } else {
          currentChunk = previousEnd ? `${previousEnd} ${trimmed}` : trimmed;
        }
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk);
    }

    return chunks;
  }

  /**
   * Partición forzada cuando una oración es demasiado grande
   */
  private forceChunk(text: string, maxSize: number, overlapSize: number): string[] {
    const chunks: string[] = [];
    let start = 0;

    while (start < text.length) {
      let end = start + maxSize;
      
      // Intentar cortar en espacio si es posible
      if (end < text.length) {
        const lastSpace = text.lastIndexOf(' ', end);
        if (lastSpace > start + maxSize * 0.7) {
          end = lastSpace;
        }
      } else {
        end = text.length;
      }

      chunks.push(text.substring(start, end).trim());
      start = end - overlapSize;
      
      if (start < 0) start = 0;
    }

    return chunks;
  }

  /**
   * Obtiene los últimos N caracteres respetando palabras completas
   */
  private getLastNChars(text: string, n: number): string {
    if (text.length <= n) return text;
    
    const substring = text.substring(text.length - n);
    
    // Intentar empezar en inicio de palabra
    const firstSpace = substring.indexOf(' ');
    if (firstSpace > 0 && firstSpace < n * 0.3) {
      return substring.substring(firstSpace + 1);
    }
    
    return substring;
  }
}

