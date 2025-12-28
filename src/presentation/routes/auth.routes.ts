import { Router } from 'express';
import { Container } from '../../infrastructure/configuration/container';
import { AuthMiddleware } from '../middleware/auth.middleware';
import { AuthController } from '../controllers/auth.controller';
import { RateLimitMiddleware } from '../middleware/rate-limit.middleware';
import { ApiTokenMiddleware } from '../middleware/api-token.middleware';

export class AuthRoutes {
  static get routes(): Router {
    const router = Router();
    const container = Container.getInstance();
    const controller = container.resolve<AuthController>('AuthController');

    // Rate limiting estricto para login/register
    router.post('/login', RateLimitMiddleware.auth, controller.loginUser);
    router.post('/register', RateLimitMiddleware.auth, controller.registerUser);
    router.post('/reset-password', RateLimitMiddleware.auth, ApiTokenMiddleware.validate, controller.resetPassword);

    router.use(AuthMiddleware.validateJWT);
    router.get('/fetchme', controller.fetchMe);
    router.post('/disclaimer', controller.updateDisclaimerChecked);

    return router;
  }
}
