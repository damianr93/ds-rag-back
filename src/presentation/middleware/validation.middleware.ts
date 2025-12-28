import { Request, Response, NextFunction } from 'express';

type ValidationFunction = (data: any) => { isValid: boolean; errors: string[] };

export class ValidationMiddleware {
  static validate(validateFn: ValidationFunction) {
    return (req: Request, res: Response, next: NextFunction) => {
      const validation = validateFn(req.body);

      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          message: validation.errors.join(', '),
          errors: validation.errors,
          timestamp: new Date().toISOString()
        });
      }

      next();
    };
  }

  static validateParams(validateFn: ValidationFunction) {
    return (req: Request, res: Response, next: NextFunction) => {
      const validation = validateFn(req.params);

      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          message: validation.errors.join(', '),
          errors: validation.errors,
          timestamp: new Date().toISOString()
        });
      }

      next();
    };
  }

  static validateQuery(validateFn: ValidationFunction) {
    return (req: Request, res: Response, next: NextFunction) => {
      const validation = validateFn(req.query);

      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          message: validation.errors.join(', '),
          errors: validation.errors,
          timestamp: new Date().toISOString()
        });
      }

      next();
    };
  }
}

