import { Request, Response, NextFunction } from 'express';

export class RoleMiddleware {
  static requireRole(requiredRole: string) {
    return (req: Request, res: Response, next: NextFunction) => {
      const user = (req as any).user;
      
      if (!user) {
        return res.status(401).json({
          success: false,
          error: "Unauthorized",
          message: "Usuario no autenticado",
        });
      }

      if (user.role !== requiredRole) {
        return res.status(403).json({
          success: false,
          error: "Forbidden",
          message: `Se requiere rol ${requiredRole}. Rol actual: ${user.role}`,
        });
      }

      next();
    };
  }

  static requireAdmin = RoleMiddleware.requireRole('ADMIN');
  static requireUser = RoleMiddleware.requireRole('USER');
}