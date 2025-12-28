import OpenAI from 'openai';
import { ChatLLM } from '../../../domain/shared/ports/llm';

export class OpenAIChatProvider implements ChatLLM {
  private readonly client: OpenAI;
  private readonly model: string;

  constructor(apiKey: string, model: string = 'gpt-4o-mini') {
    this.client = new OpenAI({ apiKey });
    this.model = model;
  }

  async chat(messages: { role: string; content: string }[]): Promise<string> {
    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: messages.map(msg => ({
          role: msg.role as 'system' | 'user' | 'assistant',
          content: msg.content,
        })),
        temperature: 0.7,
        max_tokens: 2000,
      });

      return response.choices[0]?.message?.content || '';
    } catch (error) {
      console.error('Error with OpenAI chat:', error);
      throw new Error('Failed to generate response with OpenAI');
    }
  }
}

