import { DocumentSourceEntity } from '../../entities/document-source.entity';

export interface DocumentSourceRepository {
  create(userId: number, name: string, provider: string, credentials: string, rootFolderId: string | null, clientId?: string | null, clientSecret?: string | null): Promise<DocumentSourceEntity>;
  findById(id: number): Promise<DocumentSourceEntity | null>;
  findByUserId(userId: number): Promise<DocumentSourceEntity[]>;
  findAll(): Promise<DocumentSourceEntity[]>;
  update(id: number, data: Partial<DocumentSourceEntity>): Promise<DocumentSourceEntity>;
  delete(id: number): Promise<void>;
  updateLastSync(id: number): Promise<void>;
  updateLastError(id: number, error: string | null): Promise<void>;
}

