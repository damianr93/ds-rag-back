import { Router } from 'express';
import { TrackedFilesController } from '../controllers/tracked-files.controller';
import { AuthMiddleware } from '../middleware/auth.middleware';

export const createTrackedFilesRoutes = (
  controller: TrackedFilesController
): Router => {
  const router = Router();

  // Todas las rutas requieren autenticación
  router.post('/', [AuthMiddleware.validateJWT], controller.trackFile);
  router.delete('/:sourceId/:fileId', [AuthMiddleware.validateJWT], controller.untrackFile);
  router.delete('/:sourceId/:fileId/unrag', [AuthMiddleware.validateJWT], controller.unragFile);
  router.get('/:sourceId', [AuthMiddleware.validateJWT], controller.getTrackedFiles);
  router.get('/:sourceId/map', [AuthMiddleware.validateJWT], controller.getTrackedFilesMap);
  
  // Sincronización
  router.post('/sync', [AuthMiddleware.validateJWT], controller.syncPendingFiles);
  router.get('/sync/status', [AuthMiddleware.validateJWT], controller.getSyncStatus);

  return router;
};

