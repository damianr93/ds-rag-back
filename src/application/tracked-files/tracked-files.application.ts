import { TrackedFileRepository } from '../../domain/tracked-files/ports/repositories';
import { DocumentSourceRepository } from '../../domain/document-sources/ports/repositories';
import { TrackFileDto, TrackedFileResponseDto } from '../dto/tracked-file.dto';

export class TrackedFilesApplication {
  constructor(
    private readonly trackedFileRepository: TrackedFileRepository,
    private readonly documentSourceRepository: DocumentSourceRepository
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
    // Verificar acceso
    const source = await this.documentSourceRepository.findById(sourceId);
    if (!source || source.userId !== userId) {
      throw new Error('Fuente no encontrada o no tienes acceso');
    }

    // TODO: Aquí deberíamos también eliminar los embeddings del RAG
    await this.trackedFileRepository.deleteByFileId(sourceId, fileId);
  }

  async getTrackedFiles(sourceId: number, userId: number): Promise<TrackedFileResponseDto[]> {
    // Verificar acceso
    const source = await this.documentSourceRepository.findById(sourceId);
    if (!source || source.userId !== userId) {
      throw new Error('Fuente no encontrada o no tienes acceso');
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

  async getTrackedFilesMap(sourceId: number, userId: number): Promise<Map<string, TrackedFileResponseDto>> {
    const files = await this.getTrackedFiles(sourceId, userId);
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

