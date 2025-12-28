export interface TrackedFileEntity {
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

