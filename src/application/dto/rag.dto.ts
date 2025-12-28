export type Role = 'user' | 'assistant';

export interface ConversationMessage {
  role: Role;
  content: string;
  timestamp: Date;
}

export interface SimilarDocument {
  text: string;
  source: string;
}

export interface ProcessResult {
  success: boolean;
  message: string;
  chunksCount?: number;
}

