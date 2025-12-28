import { ProcessedFileRepository } from '../../../domain/rag/ports/repositories';
import { prisma } from '../../db/prisma';

export class PrismaProcessedFileRepository implements ProcessedFileRepository {
  async exists(filename: string, fileHash: string): Promise<boolean> {
    const file = await prisma.processedFile.findFirst({
      where: {
        filename,
        fileHash
      }
    });
    return file !== null;
  }

  async insert(filename: string, fileHash: string, chunksCount: number): Promise<void> {
    await prisma.processedFile.create({
      data: {
        filename,
        fileHash,
        chunksCount
      }
    });
  }

  async getStats(): Promise<{ totalFiles: number; totalChunks: number }> {
    const totalFiles = await prisma.processedFile.count();
    const totalChunks = await prisma.processedFile.aggregate({
      _sum: {
        chunksCount: true
      }
    });

    return {
      totalFiles,
      totalChunks: totalChunks._sum.chunksCount || 0
    };
  }

  async listFiles(): Promise<{ filename: string; chunks_count: number; processed_at: Date }[]> {
    const files = await prisma.processedFile.findMany({
      orderBy: { processedAt: 'desc' }
    });

    return files.map(file => ({
      filename: file.filename,
      chunks_count: file.chunksCount,
      processed_at: file.processedAt
    }));
  }

  async clearAll(): Promise<void> {
    await prisma.processedFile.deleteMany();
  }
}
