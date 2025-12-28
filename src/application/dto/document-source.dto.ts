export interface CreateDocumentSourceDto {
  name: string;
  provider: 'google_drive' | 'dropbox' | 'onedrive' | 'local';
  credentials: {
    accessToken?: string;
    refreshToken?: string;
    [key: string]: string | undefined;
  };
  clientId?: string;
  clientSecret?: string;
  rootFolderId?: string;
}

export interface UpdateDocumentSourceDto {
  name?: string;
  credentials?: {
    accessToken?: string;
    refreshToken?: string;
    [key: string]: string | undefined;
  };
  clientId?: string;
  clientSecret?: string;
  rootFolderId?: string;
  isActive?: boolean;
}

export interface DocumentSourceResponseDto {
  id: number;
  userId: number;
  name: string;
  provider: string;
  rootFolderId: string | null;
  isActive: boolean;
  lastError: string | null; // Último error al acceder
  lastSyncAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  decryptedCredentials?: {
    accessToken?: string;
    refreshToken?: string;
    clientId?: string;
    clientSecret?: string;
    [key: string]: string | undefined;
  };
}

export interface CloudFileDto {
  id: string;
  name: string;
  mimeType: string;
  isFolder: boolean;
  size?: number;
  modifiedTime?: Date;
  webViewLink?: string;
  parentId?: string;
}

export interface SyncDocumentsDto {
  sourceId: number;
  fileIds?: string[]; // Si se especifica, solo sincroniza estos archivos
}

