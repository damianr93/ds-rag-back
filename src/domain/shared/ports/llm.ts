export interface ChatLLM {
  chat(messages: { role: 'system' | 'user' | 'assistant'; content: string }[]): Promise<string>;
}

