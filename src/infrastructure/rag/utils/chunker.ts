import { Chunker } from '../../../domain/rag/ports/services';

export class SimpleChunker implements Chunker {
  chunk(text: string, options?: { maxSize?: number; overlap?: number }): string[] {
    const maxSize = options?.maxSize ?? 1000;
    const overlap = options?.overlap ?? 200;

    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
    const chunks: string[] = [];
    let currentChunk = '';

    for (const sentence of sentences) {
      const trimmed = sentence.trim();
      if (currentChunk.length + trimmed.length + 1 <= maxSize) {
        currentChunk += (currentChunk ? '. ' : '') + trimmed;
      } else {
        if (currentChunk) {
          chunks.push(currentChunk + '.');
          const words = currentChunk.split(' ');
          const overlapWords = words.slice(-Math.floor(overlap / 10));
          currentChunk = overlapWords.join(' ') + '. ' + trimmed;
        } else {
          currentChunk = trimmed;
        }
      }
    }
    if (currentChunk) chunks.push(currentChunk + '.');
    return chunks.filter((c) => c.trim().length > 10);
  }
}

