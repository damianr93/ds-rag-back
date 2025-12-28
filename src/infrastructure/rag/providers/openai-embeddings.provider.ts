import OpenAI from 'openai';
import { EmbeddingsProvider } from '../../../domain/rag/ports/services';

export class OpenAIEmbeddingsProvider implements EmbeddingsProvider {
  private readonly client: OpenAI;
  private readonly model: string;

  constructor(apiKey: string, model: string = 'text-embedding-3-small') {
    this.client = new OpenAI({ apiKey });
    this.model = model;
  }

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.client.embeddings.create({
        model: this.model,
        input: text,
        encoding_format: 'float',
      });

      return response.data[0].embedding;
    } catch (error) {
      console.error('Error generating OpenAI embedding:', error);
      throw new Error('Failed to generate embedding with OpenAI');
    }
  }
}

