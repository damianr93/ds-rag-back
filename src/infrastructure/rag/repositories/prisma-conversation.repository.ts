import { ConversationRepository } from '../../../domain/rag/ports/repositories';
import { ConversationMessage } from '../../../application/dto/rag.dto';
import { prisma } from '../../db/prisma';

export class PrismaConversationRepository implements ConversationRepository {
  async create(userId: number, title: string): Promise<number> {
    const conversation = await prisma.conversation.create({
      data: {
        userId,
        title,
        active: true
      }
    });
    return conversation.id;
  }

  async getHistory(conversationId: number): Promise<ConversationMessage[]> {
    const messages = await prisma.conversationMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' }
    });

    return messages.map(message => ({
      role: message.role as 'user' | 'assistant',
      content: message.content,
      timestamp: message.createdAt,
    }));
  }

  async saveMessage(conversationId: number, role: 'user' | 'assistant', content: string): Promise<void> {
    await prisma.conversationMessage.create({
      data: {
        conversationId,
        role,
        content
      }
    });
  }

  async listActiveByUser(userId: number): Promise<any[]> {
    const conversations = await prisma.conversation.findMany({
      where: { 
        userId,
        active: true 
      },
      orderBy: { createdAt: 'desc' }
    });

    return conversations.map(conversation => ({
      id: conversation.id,
      title: conversation.title,
      created_at: conversation.createdAt.toISOString()
    }));
  }

  async deactivate(conversationId: number): Promise<boolean> {
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { active: false }
    });
    return true;
  }

  async updateTitle(conversationId: number, userId: number, title: string): Promise<void> {
    await prisma.conversation.update({
      where: { 
        id: conversationId,
        userId 
      },
      data: { title }
    });
  }
}
