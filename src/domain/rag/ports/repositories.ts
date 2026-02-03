import { ConversationMessage, SimilarDocument } from '../../../application/dto/rag.dto';

export interface DocumentVectorRepository {
  insertChunk(params: {
    text: string;
    embedding: number[];
    source: string;
    sourceUrl?: string;
    sourceType?: string;
    chunkIndex: number;
    totalChunks: number;
  }): Promise<void>;

  findSimilar(embedding: number[], k: number): Promise<SimilarDocument[]>;

  getAllChunksBySource(source: string): Promise<{ text: string; chunkIndex: number }[]>;

  countAll(): Promise<number>;

  clearAll(): Promise<void>;

  deleteBySource(source: string): Promise<number>;
}

export interface ConversationRepository {
  create(userId: number, title: string): Promise<number>;

  getHistory(conversationId: number): Promise<ConversationMessage[]>;

  saveMessage(
    conversationId: number,
    role: 'user' | 'assistant',
    content: string
  ): Promise<void>;

  listActiveByUser(userId: number): Promise<any[]>;

  deactivate(conversationId: number): Promise<boolean>;

  updateTitle(conversationId: number, userId: number, title: string): Promise<void>;
}

export interface ProcessedFileRepository {
  exists(filename: string, fileHash: string): Promise<boolean>;

  insert(filename: string, fileHash: string, chunksCount: number): Promise<void>;

  listFiles(): Promise<{ filename: string; chunks_count: number; processed_at: Date }[]>;

  clearAll(): Promise<void>;

  deleteByFilename(filename: string): Promise<void>;

  findByFilenamePattern(pattern: string): Promise<{ filename: string; fileHash: string; chunksCount: number; processedAt: Date }[]>;
}

