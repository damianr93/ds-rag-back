import { ChatLLM } from '../../../domain/shared/ports/llm';

export class OllamaChatProvider implements ChatLLM {
  private readonly baseUrl: string;
  private readonly model: string;

  constructor(baseUrl: string, model: string) {
    this.baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    this.model = model;
  }

  async chat(messages: { role: string; content: string }[]): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          messages: messages.map(msg => ({
            role: msg.role,
            content: msg.content,
          })),
          stream: false,
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama chat failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.message?.content || '';
    } catch (error) {
      console.error('Error with Ollama chat:', error);
      throw new Error('Failed to generate response with Ollama');
    }
  }
}
