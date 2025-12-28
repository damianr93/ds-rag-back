export interface DocumentSourceEntity {
  id: number;
  userId: number;
  name: string;
  provider: 'google_drive' | 'dropbox' | 'onedrive' | 'local';
  credentials: string; // JSON encriptado
  clientId: string | null; // OAuth Client ID (encriptado)
  clientSecret: string | null; // OAuth Client Secret (encriptado)
  rootFolderId: string | null;
  isActive: boolean;
  lastError: string | null; // Último error al acceder a la fuente
  lastSyncAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DocumentSourceCredentials {
  accessToken?: string;
  refreshToken?: string;
  clientId?: string;
  clientSecret?: string;
  [key: string]: string | undefined;
}

export interface CloudFile {
  id: string;
  name: string;
  mimeType: string;
  isFolder: boolean;
  size?: number;
  modifiedTime?: Date;
  webViewLink?: string;
  parentId?: string;
}

