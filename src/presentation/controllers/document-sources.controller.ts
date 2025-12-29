import { Request, Response } from 'express';
import { DocumentSourcesApplication } from '../../application/document-sources/document-sources.application';
import { CreateDocumentSourceDto, UpdateDocumentSourceDto } from '../../application/dto/document-source.dto';

interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email?: string;
    role?: string;
  };
}

export class DocumentSourcesController {
  constructor(private readonly application: DocumentSourcesApplication) {}

  createSource = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as AuthenticatedRequest).user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      
      const dto: CreateDocumentSourceDto = req.body;
      
      // Validación básica
      if (!dto.name || !dto.provider || !dto.credentials) {
        res.status(400).json({ 
          error: 'Missing required fields',
          details: {
            name: !!dto.name,
            provider: !!dto.provider,
            credentials: !!dto.credentials
          }
        });
        return;
      }

      const source = await this.application.createSource(userId, dto);
      res.status(201).json(source);
    } catch (error) {
      console.error('Error creating document source:', error);
      res.status(500).json({ 
        error: 'Failed to create document source',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  getUserSources = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as AuthenticatedRequest).user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      const sources = await this.application.getUserSources(userId);
      res.json(sources);
    } catch (error) {
      console.error('Error fetching user sources:', error);
      res.status(500).json({ 
        error: 'Error al obtener las fuentes',
        message: error instanceof Error ? error.message : 'Error desconocido',
        timestamp: new Date().toISOString()
      });
    }
  };

  getSourceById = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as AuthenticatedRequest).user?.id;
      const userRole = (req as AuthenticatedRequest).user?.role;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      const sourceId = parseInt(req.params.id);
      const includeCredentials = req.query.includeCredentials === 'true' && userRole === 'ADMIN';

      const source = await this.application.getSourceById(sourceId, userId, includeCredentials);
      if (!source) {
        res.status(404).json({ error: 'Source not found' });
        return;
      }

      res.json(source);
    } catch (error) {
      console.error('Error fetching source:', error);
      res.status(500).json({ 
        error: 'Error al obtener la fuente',
        message: error instanceof Error ? error.message : 'Error desconocido',
        timestamp: new Date().toISOString()
      });
    }
  };

  updateSource = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as AuthenticatedRequest).user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      const sourceId = parseInt(req.params.id);
      const dto: UpdateDocumentSourceDto = req.body;

      const source = await this.application.updateSource(sourceId, userId, dto);
      if (!source) {
        res.status(404).json({ error: 'Source not found' });
        return;
      }

      res.json(source);
    } catch (error) {
      console.error('Error updating source:', error);
      res.status(500).json({ error: 'Failed to update source' });
    }
  };

  deleteSource = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as AuthenticatedRequest).user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      const sourceId = parseInt(req.params.id);

      const deleted = await this.application.deleteSource(sourceId, userId);
      if (!deleted) {
        res.status(404).json({ error: 'Source not found' });
        return;
      }

      res.status(204).send();
    } catch (error) {
      console.error('Error deleting source:', error);
      res.status(500).json({ error: 'Failed to delete source' });
    }
  };

  listFiles = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as AuthenticatedRequest).user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      const sourceId = parseInt(req.params.id);
      const folderId = req.query.folderId as string | undefined;

      const files = await this.application.listFiles(sourceId, userId, folderId);
      res.json(files);
    } catch (error) {
      console.error('Error listing files:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to list files';
      const statusCode = errorMessage.includes('no encontrada') ? 404 
        : errorMessage.includes('inválido') || errorMessage.includes('expirado') ? 401
        : errorMessage.includes('permisos') ? 403
        : 500;
      
      res.status(statusCode).json({ 
        error: errorMessage,
        timestamp: new Date().toISOString()
      });
    }
  };

  downloadFile = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as AuthenticatedRequest).user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      const sourceId = parseInt(req.params.id);
      const fileId = req.params.fileId;

      const buffer = await this.application.downloadFile(sourceId, userId, fileId);
      
      res.setHeader('Content-Type', 'application/octet-stream');
      res.send(buffer);
    } catch (error) {
      console.error('Error downloading file:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to download file';
      const statusCode = errorMessage.includes('no encontrada') || errorMessage.includes('no encontrado') ? 404 
        : errorMessage.includes('inválido') || errorMessage.includes('expirado') ? 401
        : errorMessage.includes('permisos') ? 403
        : 500;
      
      res.status(statusCode).json({ 
        error: errorMessage,
        timestamp: new Date().toISOString()
      });
    }
  };

  getFileMetadata = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as AuthenticatedRequest).user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      const sourceId = parseInt(req.params.id);
      const fileId = req.params.fileId;

      const metadata = await this.application.getFileMetadata(sourceId, userId, fileId);
      res.json(metadata);
    } catch (error) {
      console.error('Error fetching file metadata:', error);
      res.status(500).json({ error: 'Failed to fetch file metadata' });
    }
  };

  // Admin endpoints
  getAllSourcesAdmin = async (req: Request, res: Response): Promise<void> => {
    try {
      const sources = await this.application.getAllSourcesWithUserInfo();
      res.json(sources);
    } catch (error) {
      console.error('Error fetching all sources:', error);
      res.status(500).json({ 
        error: 'Error al obtener todas las fuentes',
        message: error instanceof Error ? error.message : 'Error desconocido',
        timestamp: new Date().toISOString()
      });
    }
  };
}

