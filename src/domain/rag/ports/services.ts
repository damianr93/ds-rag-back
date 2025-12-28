export interface EmbeddingsProvider {
  generateEmbedding(text: string): Promise<number[]>;
}

export interface TextExtractor {
  supports(ext: string): boolean;
  extract(filePath: string): Promise<string>;
}

export interface Chunker {
  chunk(text: string, options?: { maxSize?: number; overlap?: number }): string[];
}

export interface QueryOptimizer {
  optimize(currentQuestion: string, conversationHistory: { role: 'user' | 'assistant'; content: string }[]): Promise<string>;
}
