import { Request, Response, NextFunction } from 'express';


interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

class InMemoryStore {
  private store: RateLimitStore = {};

  increment(key: string, windowMs: number): { count: number; resetTime: number } {
    const now = Date.now();
    
    if (!this.store[key] || this.store[key].resetTime < now) {
      this.store[key] = {
        count: 1,
        resetTime: now + windowMs
      };
    } else {
      this.store[key].count++;
    }

    return this.store[key];
  }

  cleanup() {
    const now = Date.now();
    for (const key in this.store) {
      if (this.store[key].resetTime < now) {
        delete this.store[key];
      }
    }
  }
}

const store = new InMemoryStore();

// Cleanup cada 5 minutos
setInterval(() => store.cleanup(), 5 * 60 * 1000);

export class RateLimitMiddleware {
  /**
   * Crea un middleware de rate limiting
   * @param windowMs - Ventana de tiempo en milisegundos
   * @param max - Número máximo de requests permitidos en la ventana
   */
  static create(windowMs: number, max: number) {
    return (req: Request, res: Response, next: NextFunction) => {
      // Usar la IP del usuario o el ID si está autenticado
      const user = (req as any).user;
      const identifier = user?.id ? `user:${user.id}` : `ip:${req.ip}`;
      const key = `${identifier}:${req.path}`;

      const { count, resetTime } = store.increment(key, windowMs);

      // Headers informativos
      res.setHeader('X-RateLimit-Limit', max.toString());
      res.setHeader('X-RateLimit-Remaining', Math.max(0, max - count).toString());
      res.setHeader('X-RateLimit-Reset', new Date(resetTime).toISOString());

      if (count > max) {
        return res.status(429).json({
          success: false,
          error: 'Too Many Requests',
          message: `Rate limit exceeded. Try again in ${Math.ceil((resetTime - Date.now()) / 1000)} seconds`,
          retryAfter: new Date(resetTime).toISOString(),
          timestamp: new Date().toISOString()
        });
      }

      next();
    };
  }

  static general = RateLimitMiddleware.create(15 * 60 * 1000, 999999); // Sin límite práctico
  static search = RateLimitMiddleware.create(15 * 60 * 1000, 999999); // Sin límite práctico
  static ai = RateLimitMiddleware.create(15 * 60 * 1000, 999999); // Sin límite práctico
  static scraper = RateLimitMiddleware.create(15 * 60 * 1000, 999999); // Sin límite práctico
  static auth = RateLimitMiddleware.create(15 * 60 * 1000, 999999); // Sin límite práctico

  // static general = RateLimitMiddleware.create(15 * 60 * 1000, 100); // 100 req/15min
  // static search = RateLimitMiddleware.create(15 * 60 * 1000, 10); // 10 req/15min
  // static ai = RateLimitMiddleware.create(15 * 60 * 1000, 20); // 20 req/15min
  // static scraper = RateLimitMiddleware.create(15 * 60 * 1000, 5); // 5 req/15min
  // static auth = RateLimitMiddleware.create(15 * 60 * 1000, 5); // 5 req/15min 
}

