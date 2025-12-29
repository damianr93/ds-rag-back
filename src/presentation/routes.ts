import { Router } from 'express';
import { RAGRoutes } from './routes/rag.routes';
import { AuthRoutes } from './routes/auth.routes';
import { createDocumentSourcesRoutes } from './routes/document-sources.routes';
import { createOAuthRoutes } from './routes/oauth.routes';
import { createTrackedFilesRoutes } from './routes/tracked-files.routes';
import { Container } from '../infrastructure/configuration/container';
import { DocumentSourcesController } from './controllers/document-sources.controller';
import { OAuthController } from './controllers/oauth.controller';
import { TrackedFilesController } from './controllers/tracked-files.controller';

export class AppRoutes {
  static get routes(): Router {
    const router = Router();
    const container = Container.getInstance();
    
    // Health check endpoint
    router.get('/api/health', (req, res) => {
      res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        message: 'Backend is running'
      });
    });
    
    // Rutas principales
    router.use('/api/auth', AuthRoutes.routes);
    router.use('/api/AI', RAGRoutes.routes);

    // Rutas de fuentes de documentos
    const documentSourcesController = container.resolve<DocumentSourcesController>('DocumentSourcesController');
    router.use('/api/document-sources', createDocumentSourcesRoutes(documentSourcesController));

    // Rutas OAuth
    const oauthController = container.resolve<OAuthController>('OAuthController');
    router.use('/api/document-sources/oauth', createOAuthRoutes(oauthController));

    // Rutas tracked files
    const trackedFilesController = container.resolve<TrackedFilesController>('TrackedFilesController');
    router.use('/api/tracked-files', createTrackedFilesRoutes(trackedFilesController));

    return router;
  }
}
