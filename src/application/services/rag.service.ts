import { RAGApplication } from '../rag/rag.application';
export class RAGService {
  constructor(
    private readonly app: RAGApplication,
    private readonly closePoolFn: () => Promise<void>
  ) {}

  async createConversation(userId: number, title: string): Promise<any> {
    return this.app.createConversation(userId, title);
  }

  async getConversations(userId: number): Promise<any[]> {
    return this.app.getUserConversations(userId);
  }

  async getConversationHistory(conversationId: number): Promise<any[]> {
    return this.app.getConversationHistory(conversationId);
  }

  async getHistory(conversationId: number): Promise<any[]> {
    return this.app.getConversationHistory(conversationId);
  }

  async sendMessage(conversationId: number, message: string, userId: number): Promise<any> {
    return this.app.askWithRAG(message, conversationId, userId);
  }

  async uploadFile(userId: number, file: any): Promise<any> {
    return this.app.processFile(file);
  }

  async getProcessedFiles(userId: number): Promise<any[]> {
    return []; // TODO: implementar método en RAGApplication
  }

  async deleteFile(fileId: number): Promise<void> {
    // TODO: implementar método en RAGApplication
  }

  async askWithRAG(conversationId: number, message: string, userId: number): Promise<any> {
    return this.app.askWithRAG(message, conversationId, userId);
  }

  async getUserConversations(userId: number): Promise<any[]> {
    return this.app.getUserConversations(userId);
  }

  async desactiveConversation(conversationId: number): Promise<boolean> {
    return this.app.deactivateConversation(conversationId);
  }

  async processDirectory(directoryPath: string, userId: number): Promise<any> {
    return this.app.processDirectory(directoryPath);
  }

  async processFile(filePath: string, userId: number): Promise<any> {
    return this.app.processFile(filePath);
  }

  async getStats(): Promise<any> {
    return this.app.getStats();
  }

  async generateEmbedding(text: string): Promise<number[]> {
    return this.app.generateEmbedding(text);
  }

  async searchSimilarDocuments(embedding: number[], limit: number): Promise<any[]> {
    return this.app.searchSimilarDocuments(embedding, limit);
  }

  async clearDatabase(): Promise<void> {
    return this.app.clearDatabase();
  }

  async updateConversationTitle(conversationId: number, userId: number, title: string): Promise<any> {
    return this.app.updateConversationTitle(conversationId, userId, title);
  }

  async processFileFromSource(userId: number, sourceId: number, fileId: string, fileName?: string): Promise<any> {
    return this.app.processFileFromSource(userId, sourceId, fileId, fileName);
  }

  async close(): Promise<void> {
    await this.closePoolFn();
  }
}
