/**
 * Utilidades de sanitización para prevenir XSS y otras vulnerabilidades
 */

export class Sanitizer {
  /**
   * Sanitiza un string eliminando caracteres peligrosos
   */
  static sanitizeString(input: string): string {
    if (typeof input !== 'string') {
      return '';
    }

    return input
      .trim()
      .replace(/[<>]/g, '') // Eliminar < y >
      .replace(/javascript:/gi, '') // Eliminar javascript:
      .replace(/on\w+\s*=/gi, '') // Eliminar event handlers (onclick, onload, etc)
      .substring(0, 10000); // Limitar longitud máxima
  }

  /**
   * Sanitiza una URL
   */
  static sanitizeUrl(url: string): string {
    if (typeof url !== 'string') {
      return '';
    }

    const trimmed = url.trim();
    
    // Solo permitir http y https
    if (!trimmed.match(/^https?:\/\//i)) {
      return '';
    }

    // Eliminar espacios
    return trimmed.replace(/\s/g, '');
  }

  /**
   * Sanitiza un nombre de feed/keyword
   */
  static sanitizeName(name: string): string {
    if (typeof name !== 'string') {
      return '';
    }

    return name
      .trim()
      .substring(0, 200); // Limitar longitud
  }

  /**
   * Sanitiza una descripción permitiendo algunos caracteres especiales
   */
  static sanitizeDescription(description: string): string {
    if (typeof description !== 'string') {
      return '';
    }

    return description
      .trim()
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Eliminar tags script
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '') // Eliminar iframes
      .replace(/on\w+\s*=/gi, '') // Eliminar event handlers
      .substring(0, 5000);
  }

  /**
   * Sanitiza un objeto recursivamente
   */
  static sanitizeObject(obj: any): any {
    if (typeof obj !== 'object' || obj === null) {
      if (typeof obj === 'string') {
        return Sanitizer.sanitizeString(obj);
      }
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => Sanitizer.sanitizeObject(item));
    }

    const sanitized: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        sanitized[key] = Sanitizer.sanitizeObject(obj[key]);
      }
    }
    return sanitized;
  }

  /**
   * Valida y sanitiza un email
   */
  static sanitizeEmail(email: string): string {
    if (typeof email !== 'string') {
      return '';
    }

    const trimmed = email.trim().toLowerCase();
    
    // Regex simple para email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!emailRegex.test(trimmed)) {
      return '';
    }

    return trimmed;
  }

  /**
   * Sanitiza parámetros de búsqueda
   */
  static sanitizeSearchQuery(query: string): string {
    if (typeof query !== 'string') {
      return '';
    }

    return query
      .trim()
      .replace(/[<>'"]/g, '') // Eliminar caracteres peligrosos
      .substring(0, 500); // Limitar longitud
  }

  /**
   * Sanitiza una palabra clave
   */
  static sanitizeKeyword(keyword: string): string {
    if (typeof keyword !== 'string') {
      return '';
    }

    return keyword
      .trim()
      .substring(0, 200); // Limitar longitud
  }

  /**
   * Sanitiza un ID de Telegram
   */
  static sanitizeTelegramId(telegramId: string): string {
    if (typeof telegramId !== 'string') {
      return '';
    }

    const trimmed = telegramId.trim();
    
    // Solo permitir números
    if (!/^\d+$/.test(trimmed)) {
      return '';
    }

    // Validar longitud (5-15 dígitos)
    if (trimmed.length < 5 || trimmed.length > 15) {
      return '';
    }

    return trimmed;
  }

  /**
   * Sanitiza código de país (gl) - 2 a 5 letras
   */
  static sanitizeCountry(country: string): string {
    if (typeof country !== 'string') return '';
    const trimmed = country.trim();
    if (!/^[a-zA-Z]{2,5}$/.test(trimmed)) return '';
    return trimmed.toLowerCase();
  }

  /**
   * Sanitiza rango de fecha esperado por buscadores (h, d, w, m, y)
   * Acepta variantes como 1d->d, 1w->w, 7d->w, 1m->m, 1y->y
   */
  static sanitizeDateRange(range: string): string {
    if (typeof range !== 'string') return '';
    const r = range.trim().toLowerCase();
    const map: Record<string, string> = {
      '1h': 'h', 'h': 'h',
      '1d': 'd', 'd': 'd',
      '7d': 'w', '1w': 'w', 'w': 'w',
      '1m': 'm', 'm': 'm',
      '1y': 'y', 'y': 'y',
    };
    return map[r] ?? '';
  }
}

