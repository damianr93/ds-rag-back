import { TrackedFileRepository } from '../../domain/tracked-files/ports/repositories';
import { DocumentSourceRepository } from '../../domain/document-sources/ports/repositories';
import { RAGApplication } from '../rag/rag.application';
import { DocumentSourcesApplication } from '../document-sources/document-sources.application';

export interface SyncLog {
  timestamp: Date;
  level: 'info' | 'success' | 'error' | 'warning';
  message: string;
  fileId?: string;
  fileName?: string;
}

export interface SyncResult {
  success: boolean;
  processedCount: number;
  errorCount: number;
  logs: SyncLog[];
}

export class RagSyncService {
  private logs: SyncLog[] = [];
  private isRunning = false;

  constructor(
    private readonly trackedFileRepository: TrackedFileRepository,
    private readonly documentSourceRepository: DocumentSourceRepository,
    private readonly documentSourcesApp: DocumentSourcesApplication,
    private readonly ragApplication: RAGApplication
  ) {}

  async syncPendingFiles(userId: number): Promise<SyncResult> {
    if (this.isRunning) {
      throw new Error('Ya hay una sincronización en curso');
    }

    this.isRunning = true;
    this.logs = [];
    let processedCount = 0;
    let errorCount = 0;

    try {
      this.addLog('info', 'Iniciando sincronización de archivos...');

      // Obtener archivos pending
      const pendingFiles = await this.trackedFileRepository.findPendingFiles(50);
      
      if (pendingFiles.length === 0) {
        this.addLog('info', 'No hay archivos pendientes para procesar');
        return {
          success: true,
          processedCount: 0,
          errorCount: 0,
          logs: this.logs,
        };
      }

      this.addLog('info', `Encontrados ${pendingFiles.length} archivos para procesar`);

      // Procesar cada archivo
      for (const file of pendingFiles) {
        try {
          // Validar que el usuario tenga acceso a la fuente
          const source = await this.documentSourceRepository.findById(file.sourceId);
          if (!source || source.userId !== userId) {
            this.addLog('warning', `Archivo ${file.fileName} pertenece a otra fuente, omitiendo`, file.fileId, file.fileName);
            continue;
          }

          // Si es una carpeta, procesar todos los archivos dentro
          if (file.isFolder) {
            await this.processFolderFiles(file, source, userId);
          } else {
            // Procesar archivo individual
            await this.processFile(file, source, userId);
          }

          processedCount++;
          this.addLog('success', `✓ ${file.fileName} procesado exitosamente`, file.fileId, file.fileName);
        } catch (error) {
          errorCount++;
          const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
          this.addLog('error', `✗ Error en ${file.fileName}: ${errorMessage}`, file.fileId, file.fileName);
          
          await this.trackedFileRepository.updateStatus(
            file.id,
            'error',
            errorMessage
          );
        }
      }

      this.addLog('info', `Sincronización completada: ${processedCount} exitosos, ${errorCount} errores`);

      return {
        success: true,
        processedCount,
        errorCount,
        logs: this.logs,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      this.addLog('error', `Error fatal en sincronización: ${errorMessage}`);
      
      return {
        success: false,
        processedCount,
        errorCount,
        logs: this.logs,
      };
    } finally {
      this.isRunning = false;
    }
  }

  private async processFile(file: any, source: any, userId: number): Promise<void> {
    this.addLog('info', `Descargando ${file.fileName}...`, file.fileId, file.fileName);

    // Actualizar estado a processing
    await this.trackedFileRepository.updateStatus(file.id, 'processing');

    // Procesar con RAG usando el método existente
    const result = await this.ragApplication.processFileFromSource(
      userId,
      source.id,
      file.fileId,
      file.fileName
    );

    if (!result.success) {
      throw new Error(result.message || 'Error al procesar archivo');
    }

    this.addLog('info', `Procesando ${file.fileName} con RAG...`, file.fileId, file.fileName);

    // Actualizar estado a completed
    await this.trackedFileRepository.updateProcessed(file.id, result.chunksCount || 0);
  }

  private async processFolderFiles(folder: any, source: any, userId: number): Promise<void> {
    this.addLog('info', `Procesando carpeta ${folder.fileName}...`, folder.fileId, folder.fileName);

    if (!folder.includeChildren) {
      this.addLog('info', `Carpeta ${folder.fileName} no incluye hijos, omitiendo`, folder.fileId, folder.fileName);
      return;
    }

    // Usar el método del DocumentSourcesApplication que maneja la desencriptación
    const files = await this.documentSourcesApp.listFiles(source.id, userId, folder.fileId);
    
    this.addLog('info', `Encontrados ${files.length} archivos en ${folder.fileName}`, folder.fileId, folder.fileName);

    // Procesar cada archivo de la carpeta
    for (const file of files) {
      if (!file.isFolder) {
        try {
          // Crear o actualizar tracked file para este archivo
          const existingTracked = await this.trackedFileRepository.findByFileId(source.id, file.id);
          
          if (!existingTracked) {
            // Crear nuevo tracked file
            const newTracked = await this.trackedFileRepository.create({
              sourceId: source.id,
              fileId: file.id,
              fileName: file.name,
              filePath: `${folder.filePath}/${file.name}`,
              isFolder: false,
              lastModified: file.modifiedTime || new Date(),
            });
            
            await this.processFile(newTracked, source, userId);
          } else if (existingTracked.status === 'pending') {
            await this.processFile(existingTracked, source, userId);
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
          this.addLog('error', `Error en archivo ${file.name}: ${errorMessage}`, file.id, file.name);
        }
      }
    }

    // Marcar carpeta como completada
    await this.trackedFileRepository.updateProcessed(folder.id, 0);
  }

  private addLog(
    level: SyncLog['level'],
    message: string,
    fileId?: string,
    fileName?: string
  ): void {
    const log: SyncLog = {
      timestamp: new Date(),
      level,
      message,
      fileId,
      fileName,
    };
    this.logs.push(log);
    
    // Solo loguear errores en consola
    if (level === 'error') {
      console.error(`[RAG SYNC] ${message}`);
    }
  }

  getLogs(): SyncLog[] {
    return [...this.logs];
  }

  isCurrentlyRunning(): boolean {
    return this.isRunning;
  }
}

