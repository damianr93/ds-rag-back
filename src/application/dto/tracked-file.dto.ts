export interface TrackFileDto {
  sourceId: number;
  fileId: string;
  fileName: string;
  filePath: string;
  isFolder: boolean;
  includeChildren?: boolean;
}

export interface TrackedFileResponseDto {
  id: number;
  sourceId: number;
  fileId: string;
  fileName: string;
  filePath: string;
  fileHash: string | null;
  lastModified: Date;
  lastProcessedAt: Date | null;
  isFolder: boolean;
  includeChildren: boolean;
  status: 'pending' | 'processing' | 'completed' | 'error';
  errorMessage: string | null;
  chunksCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SyncFilesDto {
  sourceId: number;
  fileIds: string[]; // IDs de archivos/carpetas a sincronizar
}

