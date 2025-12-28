import { NextFunction, Request, Response } from 'express';
import { envs } from '../../config';

export class ApiTokenMiddleware {
  static validate(req: Request, res: Response, next: NextFunction) {
    // Si no hay X_TOKEN_API configurado, simplemente pasar
    if (!envs.X_TOKEN_API) {
      return next();
    }

    const token = req.header('x-token-api');

    if (!token || token !== envs.X_TOKEN_API) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Invalid or missing X-TOKEN-API header',
        timestamp: new Date().toISOString(),
      });
    }

    next();
  }
}
