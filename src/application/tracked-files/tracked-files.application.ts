import { TrackedFileRepository } from '../../domain/tracked-files/ports/repositories';
import { DocumentSourceRepository } from '../../domain/document-sources/ports/repositories';
import { DocumentVectorRepository, ProcessedFileRepository } from '../../domain/rag/ports/repositories';
import { TrackFileDto, TrackedFileResponseDto } from '../dto/tracked-file.dto';

export class TrackedFilesApplication {
  constructor(
    private readonly trackedFileRepository: TrackedFileRepository,
    private readonly documentSourceRepository: DocumentSourceRepository,
    private readonly documentVectorRepository?: DocumentVectorRepository,
    private readonly processedFileRepository?: ProcessedFileRepository
  ) {}

  async trackFile(dto: TrackFileDto, userId: number): Promise<TrackedFileResponseDto> {
    // Verificar que el usuario tiene acceso a la fuente
    const source = await this.documentSourceRepository.findById(dto.sourceId);
    if (!source || source.userId !== userId) {
      throw new Error('Fuente no encontrada o no tienes acceso');
    }

    // Verificar si ya existe
    const existing = await this.trackedFileRepository.findByFileId(dto.sourceId, dto.fileId);
    if (existing) {
      return this.toResponseDto(existing);
    }

    // Crear nuevo tracked file
    const tracked = await this.trackedFileRepository.create({
      sourceId: dto.sourceId,
      fileId: dto.fileId,
      fileName: dto.fileName,
      filePath: dto.filePath,
      isFolder: dto.isFolder,
      includeChildren: dto.includeChildren ?? true,
      lastModified: new Date(), // Se actualizará cuando se procese
    });

    return this.toResponseDto(tracked);
  }

  async untrackFile(sourceId: number, fileId: string, userId: number): Promise<void> {
    const source = await this.documentSourceRepository.findById(sourceId);
    if (!source || source.userId !== userId) {
      throw new Error('Fuente no encontrada o no tienes acceso');
    }

    await this.trackedFileRepository.deleteByFileId(sourceId, fileId);
  }

  async unragFile(sourceId: number, fileId: string, userId: number): Promise<void> {
    const source = await this.documentSourceRepository.findById(sourceId);
    if (!source || source.userId !== userId) {
      throw new Error('Fuente no encontrada o no tienes acceso');
    }

    const trackedFile = await this.trackedFileRepository.findByFileId(sourceId, fileId);
    if (!trackedFile) {
      throw new Error('Archivo no encontrado en el tracking');
    }

    if (trackedFile.isFolder) {
      throw new Error('No se puede des-ragear una carpeta. Des-ragea los archivos individuales dentro de ella.');
    }

    const sanitizedFilename = this.sanitizeFilename(trackedFile.fileName);

    if (this.processedFileRepository) {
      const processedFiles = await this.processedFileRepository.findByFilenamePattern(sanitizedFilename);
      
      if (processedFiles.length === 0 && this.documentVectorRepository) {
        await this.documentVectorRepository.deleteBySource(sanitizedFilename);
      } else {
        for (const processedFile of processedFiles) {
          if (this.documentVectorRepository) {
            await this.documentVectorRepository.deleteBySource(processedFile.filename);
          }
          await this.processedFileRepository.deleteByFilename(processedFile.filename);
        }
      }
    } else if (this.documentVectorRepository) {
      await this.documentVectorRepository.deleteBySource(sanitizedFilename);
    }

    await this.trackedFileRepository.deleteByFileId(sourceId, fileId);
  }

  private sanitizeFilename(filename: string): string {
    return filename
      .replace(/[/\\:*?"<>|]/g, '_')
      .replace(/\s+/g, '_')
      .replace(/_+/g, '_')
      .trim();
  }

  async getTrackedFiles(sourceId: number, userId: number, userRole?: string): Promise<TrackedFileResponseDto[]> {
    // Verificar acceso
    const source = await this.documentSourceRepository.findById(sourceId);
    if (!source) {
      throw new Error('Fuente no encontrada o no tienes acceso');
    }
    
    // Los usuarios USER pueden acceder a cualquier fuente activa
    // Los ADMIN solo pueden acceder a sus propias fuentes
    if (userRole !== 'USER' && source.userId !== userId) {
      throw new Error('Fuente no encontrada o no tienes acceso');
    }
    
    if (!source.isActive) {
      throw new Error('La fuente está inactiva');
    }

    const files = await this.trackedFileRepository.findBySourceId(sourceId);
    return files.map(this.toResponseDto);
  }

  async isFileTracked(sourceId: number, fileId: string, userId: number): Promise<boolean> {
    // Verificar acceso
    const source = await this.documentSourceRepository.findById(sourceId);
    if (!source || source.userId !== userId) {
      return false;
    }

    const tracked = await this.trackedFileRepository.findByFileId(sourceId, fileId);
    return tracked !== null;
  }

  async getTrackedFilesMap(sourceId: number, userId: number, userRole?: string): Promise<Map<string, TrackedFileResponseDto>> {
    const files = await this.getTrackedFiles(sourceId, userId, userRole);
    const map = new Map<string, TrackedFileResponseDto>();
    files.forEach(file => map.set(file.fileId, file));
    return map;
  }

  private toResponseDto(file: any): TrackedFileResponseDto {
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
      status: file.status,
      errorMessage: file.errorMessage,
      chunksCount: file.chunksCount,
      createdAt: file.createdAt,
      updatedAt: file.updatedAt,
    };
  }
}

