import { Router } from 'express';
import { DocumentSourcesController } from '../controllers/document-sources.controller';
import { AuthMiddleware } from '../middleware/auth.middleware';
import { AdminMiddleware } from '../middleware/admin.middleware';

export const createDocumentSourcesRoutes = (
  controller: DocumentSourcesController
): Router => {
  const router = Router();

  // Rutas de administrador
  router.get('/admin/all', [AuthMiddleware.validateJWT, AdminMiddleware.validateAdmin], controller.getAllSourcesAdmin);

  // Rutas de gestión (solo ADMIN)
  router.post('/', [AuthMiddleware.validateJWT, AdminMiddleware.validateAdmin], controller.createSource);
  router.put('/:id', [AuthMiddleware.validateJWT, AdminMiddleware.validateAdmin], controller.updateSource);
  router.delete('/:id', [AuthMiddleware.validateJWT, AdminMiddleware.validateAdmin], controller.deleteSource);
  
  // Rutas de lectura (todos los usuarios autenticados)
  router.get('/', [AuthMiddleware.validateJWT], controller.getUserSources);
  router.get('/:id', [AuthMiddleware.validateJWT], controller.getSourceById);
  
  // Operaciones con archivos (todos los usuarios autenticados)
  router.get('/:id/files', [AuthMiddleware.validateJWT], controller.listFiles);
  router.get('/:id/files/:fileId', [AuthMiddleware.validateJWT], controller.getFileMetadata);
  router.get('/:id/files/:fileId/download', [AuthMiddleware.validateJWT], controller.downloadFile);

  return router;
};

