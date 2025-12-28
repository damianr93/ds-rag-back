import { NextFunction, Request, Response } from 'express';

interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email?: string;
    role?: string;
  };
}

export class AdminMiddleware {
  /**
   * Middleware to verify that the user is an administrator
   */
  static validateAdmin(req: Request, res: Response, next: NextFunction): void {
    const user = (req as AuthenticatedRequest).user;

    if (!user) {
      res.status(401).json({ error: 'Unauthorized - No user found' });
      return;
    }

    if (user.role !== 'ADMIN') {
      res.status(403).json({ error: 'Forbidden - Admin access required' });
      return;
    }

    next();
  }
}

