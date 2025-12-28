import { Request, Response, NextFunction } from 'express';
import { TokenService } from '../../domain/shared/ports/security';

interface JwtPayload {
  id: number;
  email?: string;
  role?: string;
}

type AuthenticatedRequest = Request & {
  user?: {
    id: number;
    email?: string;
    name?: string;
    role?: string;
  };
};

export class AuthMiddleware {
  private static tokenService: TokenService | null = null;

  static configure(tokenService: TokenService) {
    AuthMiddleware.tokenService = tokenService;
  }

  static authenticate = AuthMiddleware.validateJWT;

  static async validateJWT(req: Request, res: Response, next: NextFunction) {
    if (!AuthMiddleware.tokenService) {
      throw new Error('AuthMiddleware not configured with a TokenService');
    }

    const authHeader = req.headers['authorization'];
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Missing or malformed Authorization header',
        timestamp: new Date().toISOString(),
      });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Missing or malformed Authorization header',
        timestamp: new Date().toISOString(),
      });
    }

    try {
      const decoded = await AuthMiddleware.tokenService.validate<JwtPayload>(token);
      if (!decoded) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'Invalid or expired token',
          timestamp: new Date().toISOString(),
        });
      }

      (req as AuthenticatedRequest).user = {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role,
      };

      next();
    } catch (error) {
      console.error('AuthMiddleware.validateJWT', error);
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Invalid or expired token',
        timestamp: new Date().toISOString(),
      });
    }
  }
}
