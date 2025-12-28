import { Router } from 'express';
import { OAuthController } from '../controllers/oauth.controller';
import { AuthMiddleware } from '../middleware/auth.middleware';
import { AdminMiddleware } from '../middleware/admin.middleware';

export const createOAuthRoutes = (controller: OAuthController): Router => {
  const router = Router();

  // Iniciar flujo OAuth (solo ADMIN)
  router.post(
    '/authorize',
    [AuthMiddleware.validateJWT, AdminMiddleware.validateAdmin],
    controller.authorize
  );

  // Callback OAuth (público, no requiere auth porque viene desde el proveedor)
  router.get('/callback', controller.callback);

  return router;
};

