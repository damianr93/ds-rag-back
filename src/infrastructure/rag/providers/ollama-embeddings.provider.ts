import { EmbeddingsProvider } from '../../../domain/rag/ports/services';

export class OllamaEmbeddingsProvider implements EmbeddingsProvider {
  private readonly baseUrl: string;
  private readonly model: string;

  constructor(baseUrl: string, model: string) {
    this.baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    this.model = model;
  }

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          prompt: text,
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama embeddings failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.embedding || [];
    } catch (error) {
      console.error('Error generating Ollama embedding:', error);
      throw new Error('Failed to generate embedding with Ollama');
    }
  }
}
