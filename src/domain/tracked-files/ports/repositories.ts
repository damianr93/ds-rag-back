import { TrackedFileEntity } from '../../entities/tracked-file.entity';

export interface TrackedFileRepository {
  create(data: {
    sourceId: number;
    fileId: string;
    fileName: string;
    filePath: string;
    fileHash?: string;
    lastModified: Date;
    isFolder: boolean;
    includeChildren?: boolean;
  }): Promise<TrackedFileEntity>;
  
  findById(id: number): Promise<TrackedFileEntity | null>;
  findBySourceId(sourceId: number): Promise<TrackedFileEntity[]>;
  findByFileId(sourceId: number, fileId: string): Promise<TrackedFileEntity | null>;
  findPendingFiles(limit?: number): Promise<TrackedFileEntity[]>;
  findFilesNeedingUpdate(): Promise<TrackedFileEntity[]>;
  
  update(id: number, data: Partial<TrackedFileEntity>): Promise<TrackedFileEntity>;
  updateStatus(id: number, status: TrackedFileEntity['status'], errorMessage?: string): Promise<void>;
  updateProcessed(id: number, chunksCount: number): Promise<void>;
  
  delete(id: number): Promise<void>;
  deleteBySourceId(sourceId: number): Promise<void>;
  deleteByFileId(sourceId: number, fileId: string): Promise<void>;
}

