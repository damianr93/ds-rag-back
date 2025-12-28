import { PrismaClient } from '@prisma/client';
import { TrackedFileRepository } from '../../../domain/tracked-files/ports/repositories';
import { TrackedFileEntity } from '../../../domain/entities/tracked-file.entity';

export class PrismaTrackedFileRepository implements TrackedFileRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: {
    sourceId: number;
    fileId: string;
    fileName: string;
    filePath: string;
    fileHash?: string;
    lastModified: Date;
    isFolder: boolean;
    includeChildren?: boolean;
  }): Promise<TrackedFileEntity> {
    const file = await this.prisma.trackedFile.create({
      data: {
        sourceId: data.sourceId,
        fileId: data.fileId,
        fileName: data.fileName,
        filePath: data.filePath,
        fileHash: data.fileHash || null,
        lastModified: data.lastModified,
        isFolder: data.isFolder,
        includeChildren: data.includeChildren ?? true,
        status: 'pending',
      },
    });

    return this.mapToEntity(file);
  }

  async findById(id: number): Promise<TrackedFileEntity | null> {
    const file = await this.prisma.trackedFile.findUnique({
      where: { id },
    });

    return file ? this.mapToEntity(file) : null;
  }

  async findBySourceId(sourceId: number): Promise<TrackedFileEntity[]> {
    const files = await this.prisma.trackedFile.findMany({
      where: { sourceId },
      orderBy: { createdAt: 'desc' },
    });

    return files.map(this.mapToEntity);
  }

  async findByFileId(sourceId: number, fileId: string): Promise<TrackedFileEntity | null> {
    const file = await this.prisma.trackedFile.findUnique({
      where: {
        sourceId_fileId: {
          sourceId,
          fileId,
        },
      },
    });

    return file ? this.mapToEntity(file) : null;
  }

  async findPendingFiles(limit = 10): Promise<TrackedFileEntity[]> {
    const files = await this.prisma.trackedFile.findMany({
      where: { status: 'pending' },
      take: limit,
      orderBy: { createdAt: 'asc' },
    });

    return files.map(this.mapToEntity);
  }

  async findFilesNeedingUpdate(): Promise<TrackedFileEntity[]> {
    // Archivos que fueron modificados después de ser procesados
    // Usamos una consulta raw para comparar fechas
    const files = await this.prisma.$queryRaw<any[]>`
      SELECT * FROM "TrackedFile"
      WHERE status = 'completed'
        AND "lastModified" > COALESCE("lastProcessedAt", '1970-01-01'::timestamp)
      ORDER BY "lastModified" DESC
    `;

    return files.map(this.mapToEntity);
  }

  async update(id: number, data: Partial<TrackedFileEntity>): Promise<TrackedFileEntity> {
    const file = await this.prisma.trackedFile.update({
      where: { id },
      data: {
        fileName: data.fileName,
        filePath: data.filePath,
        fileHash: data.fileHash,
        lastModified: data.lastModified,
        lastProcessedAt: data.lastProcessedAt,
        status: data.status,
        errorMessage: data.errorMessage,
        chunksCount: data.chunksCount,
        includeChildren: data.includeChildren,
      },
    });

    return this.mapToEntity(file);
  }

  async updateStatus(id: number, status: TrackedFileEntity['status'], errorMessage?: string): Promise<void> {
    await this.prisma.trackedFile.update({
      where: { id },
      data: {
        status,
        errorMessage: errorMessage || null,
      },
    });
  }

  async updateProcessed(id: number, chunksCount: number): Promise<void> {
    await this.prisma.trackedFile.update({
      where: { id },
      data: {
        status: 'completed',
        lastProcessedAt: new Date(),
        chunksCount,
        errorMessage: null,
      },
    });
  }

  async delete(id: number): Promise<void> {
    await this.prisma.trackedFile.delete({
      where: { id },
    });
  }

  async deleteBySourceId(sourceId: number): Promise<void> {
    await this.prisma.trackedFile.deleteMany({
      where: { sourceId },
    });
  }

  async deleteByFileId(sourceId: number, fileId: string): Promise<void> {
    await this.prisma.trackedFile.delete({
      where: {
        sourceId_fileId: {
          sourceId,
          fileId,
        },
      },
    });
  }

  private mapToEntity(file: any): TrackedFileEntity {
    return {
      id: file.id,
      sourceId: file.sourceId,
      fileId: file.fileId,
      fileName: file.fileName,
      filePath: file.filePath,
      fileHash: file.fileHash,
      lastModified: file.lastModified,
      lastProcessedAt: file.lastProcessedAt,
      isFolder: file.isFolder,
      includeChildren: file.includeChildren,
      status: file.status as TrackedFileEntity['status'],
      errorMessage: file.errorMessage,
      chunksCount: file.chunksCount,
      createdAt: file.createdAt,
      updatedAt: file.updatedAt,
    };
  }
}

