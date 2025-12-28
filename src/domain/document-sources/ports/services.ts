import { CloudFile, DocumentSourceCredentials } from '../../entities/document-source.entity';

export interface CloudStorageProvider {
  listFiles(credentials: DocumentSourceCredentials, folderId?: string): Promise<CloudFile[]>;
  downloadFile(credentials: DocumentSourceCredentials, fileId: string): Promise<Buffer>;
  getFileMetadata(credentials: DocumentSourceCredentials, fileId: string): Promise<CloudFile>;
}

