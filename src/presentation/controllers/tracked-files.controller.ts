import { Request, Response } from 'express';
import { TrackedFilesApplication } from '../../application/tracked-files/tracked-files.application';
import { RagSyncService } from '../../application/services/rag-sync.service';

interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email?: string;
    role?: string;
  };
}

export class TrackedFilesController {
  constructor(
    private readonly application: TrackedFilesApplication,
    private readonly syncService: RagSyncService
  ) {}

  trackFile = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as AuthenticatedRequest).user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const tracked = await this.application.trackFile(req.body, userId);
      res.status(201).json(tracked);
    } catch (error) {
      console.error('Error tracking file:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Error al agregar archivo al tracking'
      });
    }
  };

  untrackFile = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as AuthenticatedRequest).user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { sourceId, fileId } = req.params;
      await this.application.untrackFile(Number(sourceId), fileId, userId);
      res.status(204).send();
    } catch (error) {
      console.error('Error untracking file:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Error al quitar archivo del tracking'
      });
    }
  };

  getTrackedFiles = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as AuthenticatedRequest).user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { sourceId } = req.params;
      const files = await this.application.getTrackedFiles(Number(sourceId), userId);
      res.json(files);
    } catch (error) {
      console.error('Error getting tracked files:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Error al obtener archivos tracked'
      });
    }
  };

  getTrackedFilesMap = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as AuthenticatedRequest).user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { sourceId } = req.params;
      const map = await this.application.getTrackedFilesMap(Number(sourceId), userId);
      
      // Convertir Map a objeto para JSON
      const obj: Record<string, any> = {};
      map.forEach((value, key) => {
        obj[key] = value;
      });
      
      res.json(obj);
    } catch (error) {
      console.error('Error getting tracked files map:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Error al obtener mapa de archivos'
      });
    }
  };

  syncPendingFiles = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as AuthenticatedRequest).user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      if (this.syncService.isCurrentlyRunning()) {
        res.status(409).json({ error: 'Ya hay una sincronización en curso' });
        return;
      }

      const result = await this.syncService.syncPendingFiles(userId);
      res.json(result);
    } catch (error) {
      console.error('Error syncing files:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Error al sincronizar archivos'
      });
    }
  };

  getSyncStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as AuthenticatedRequest).user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const isRunning = this.syncService.isCurrentlyRunning();
      const logs = this.syncService.getLogs();

      res.json({
        isRunning,
        logs,
      });
    } catch (error) {
      console.error('Error getting sync status:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Error al obtener estado de sincronización'
      });
    }
  };
}

