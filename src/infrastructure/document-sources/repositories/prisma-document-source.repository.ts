import { PrismaClient } from '@prisma/client';
import { DocumentSourceRepository } from '../../../domain/document-sources/ports/repositories';
import { DocumentSourceEntity } from '../../../domain/entities/document-source.entity';

export class PrismaDocumentSourceRepository implements DocumentSourceRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(
    userId: number,
    name: string,
    provider: string,
    credentials: string,
    rootFolderId: string | null,
    clientId?: string | null,
    clientSecret?: string | null
  ): Promise<DocumentSourceEntity> {
    const source = await this.prisma.documentSource.create({
      data: {
        userId,
        name,
        provider,
        credentials,
        rootFolderId,
        clientId: clientId || null,
        clientSecret: clientSecret || null,
      },
    });

    return this.mapToEntity(source);
  }

  async findById(id: number): Promise<DocumentSourceEntity | null> {
    const source = await this.prisma.documentSource.findUnique({
      where: { id },
    });

    return source ? this.mapToEntity(source) : null;
  }

  async findByUserId(userId: number): Promise<DocumentSourceEntity[]> {
    const sources = await this.prisma.documentSource.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return sources.map(this.mapToEntity);
  }

  async findAll(): Promise<DocumentSourceEntity[]> {
    const sources = await this.prisma.documentSource.findMany({
      include: {
        user: {
          select: {
            email: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return sources.map(source => ({
      ...this.mapToEntity(source),
      user: source.user,
    } as any));
  }

  async findAllActive(): Promise<DocumentSourceEntity[]> {
    const sources = await this.prisma.documentSource.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    return sources.map(this.mapToEntity);
  }

  async update(id: number, data: Partial<DocumentSourceEntity>): Promise<DocumentSourceEntity> {
    const source = await this.prisma.documentSource.update({
      where: { id },
      data: {
        name: data.name,
        credentials: data.credentials,
        clientId: data.clientId,
        clientSecret: data.clientSecret,
        rootFolderId: data.rootFolderId,
        isActive: data.isActive,
      },
    });

    return this.mapToEntity(source);
  }

  async delete(id: number): Promise<void> {
    await this.prisma.documentSource.delete({
      where: { id },
    });
  }

  async updateLastSync(id: number): Promise<void> {
    await this.prisma.documentSource.update({
      where: { id },
      data: { lastSyncAt: new Date() },
    });
  }

  async updateLastError(id: number, error: string | null): Promise<void> {
    await this.prisma.documentSource.update({
      where: { id },
      data: { lastError: error },
    });
  }

  private mapToEntity(source: {
    id: number;
    userId: number;
    name: string;
    provider: string;
    credentials: string;
    clientId?: string | null;
    clientSecret?: string | null;
    rootFolderId: string | null;
    isActive: boolean;
    lastError?: string | null;
    lastSyncAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): DocumentSourceEntity {
    return {
      id: source.id,
      userId: source.userId,
      name: source.name,
      provider: source.provider as 'google_drive' | 'dropbox' | 'onedrive' | 'local',
      credentials: source.credentials,
      clientId: source.clientId || null,
      clientSecret: source.clientSecret || null,
      rootFolderId: source.rootFolderId,
      isActive: source.isActive,
      lastError: source.lastError || null,
      lastSyncAt: source.lastSyncAt,
      createdAt: source.createdAt,
      updatedAt: source.updatedAt,
    };
  }
}

