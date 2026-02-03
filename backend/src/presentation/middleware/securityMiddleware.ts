import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import helmet from 'helmet';
import { config } from '../../config';
import { SecurityLogger } from '../../utils/logger';

/**
 * Middlewares de Seguridad
 * Implementan protecciones contra ataques comunes (OWASP)
 */

/**
 * Rate Limiting para prevenir ataques de fuerza bruta
 * Protección OWASP: A07:2021 – Identification and Authentication Failures
 */
export const loginRateLimiter = rateLimit({
  windowMs: config.security.rateLimitWindowMs, // 15 minutos
  max: config.security.rateLimitMaxRequests, // 5 intentos
  message: {
    success: false,
    message: 'Demasiados intentos de login. Intente nuevamente más tarde.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    SecurityLogger.logSecurityEvent(
      'Rate limit exceeded for login',
      'medium',
      {
        ip: req.ip,
        path: req.path,
      }
    );

    res.status(429).json({
      success: false,
      message: 'Demasiados intentos de login. Intente nuevamente en 15 minutos.',
    });
  },
});

/**
 * Rate Limiting general para API
 */
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 200, // Aumentado a 200 peticiones por ventana para desarrollo
  message: {
    success: false,
    message: 'Demasiadas peticiones. Intente nuevamente más tarde.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Configuración de Helmet para headers de seguridad
 * Protección contra XSS, clickjacking, etc.
 */
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: true,
  crossOriginResourcePolicy: { policy: 'same-site' },
  dnsPrefetchControl: true,
  frameguard: { action: 'deny' },
  hidePoweredBy: true,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  ieNoOpen: true,
  noSniff: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  xssFilter: true,
});

/**
 * Sanitización de datos para prevenir inyección NoSQL
 * Protección OWASP: A03:2021 – Injection
 */
export const sanitizeData = mongoSanitize({
  replaceWith: '_',
  onSanitize: ({ req, key }) => {
    SecurityLogger.logSuspiciousActivity(
      'NoSQL injection attempt detected',
      {
        ip: req.ip,
        path: req.path,
        key,
      }
    );
  },
});

/**
 * Middleware para validar Content-Type en peticiones POST/PUT
 * Previene algunos tipos de ataques
 */
export const validateContentType = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    const contentType = req.headers['content-type'];

    if (!contentType || !contentType.includes('application/json')) {
      SecurityLogger.logSuspiciousActivity(
        'Invalid Content-Type header',
        {
          ip: req.ip,
          path: req.path,
          contentType,
        }
      );

      res.status(400).json({
        success: false,
        message: 'Content-Type debe ser application/json',
      });
      return;
    }
  }

  next();
};

/**
 * Middleware para logging de peticiones sospechosas
 */
export const detectSuspiciousActivity = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const suspiciousPatterns = [
    /<script[^>]*>/i,
    /javascript:/i,
    /onerror\s*=/i,
    /onclick\s*=/i,
    /\$ne\s*:/i,
    /\$gt\s*:/i,
    /\$lt\s*:/i,
    /\.\.[\/\\]/i, // Path traversal más específico
    /etc\/passwd/i,
    /\.\.%2F/i,
  ];

  // Patrón de email válido para excluir de validación
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const checkData = (data: any): boolean => {
    if (typeof data === 'string') {
      // Si es un email válido, no validar como sospechoso
      if (emailPattern.test(data.trim())) {
        return false;
      }
      return suspiciousPatterns.some((pattern) => pattern.test(data));
    }

    if (typeof data === 'object' && data !== null) {
      return Object.values(data).some((value) => checkData(value));
    }

    return false;
  };

  const suspicious =
    checkData(req.query) ||
    checkData(req.body) ||
    checkData(req.params);

  if (suspicious) {
    SecurityLogger.logSuspiciousActivity(
      'Suspicious input pattern detected',
      {
        ip: req.ip,
        path: req.path,
        method: req.method,
      }
    );

    res.status(400).json({
      success: false,
      message: 'Petición rechazada por contener patrones sospechosos',
    });
    return;
  }

  next();
};

/**
 * Middleware para prevenir CSRF en peticiones state-changing
 * Nota: Para frontend separado, verificar origin/referer
 */
export const csrfProtection = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    const origin = req.headers.origin || req.headers.referer;

    if (!origin) {
      SecurityLogger.logSuspiciousActivity(
        'Missing origin/referer header in state-changing request',
        {
          ip: req.ip,
          path: req.path,
          method: req.method,
        }
      );

      // En desarrollo permitir sin origin (para testing con Postman)
      if (config.env !== 'development') {
        res.status(403).json({
          success: false,
          message: 'CSRF protection: Origin header required',
        });
        return;
      }
    }

    // Verificar que el origin coincide con los permitidos
    if (origin && !origin.includes(config.cors.origin)) {
      SecurityLogger.logSuspiciousActivity(
        'CSRF attack detected: Invalid origin',
        {
          ip: req.ip,
          path: req.path,
          origin,
        }
      );

      res.status(403).json({
        success: false,
        message: 'CSRF protection: Invalid origin',
      });
      return;
    }
  }

  next();
};

/**
 * Middleware para agregar headers de seguridad adicionales
 */
export const additionalSecurityHeaders = (
  _req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Prevenir MIME sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Prevenir clickjacking
  res.setHeader('X-Frame-Options', 'DENY');

  // Habilitar XSS filter del navegador
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Política de permisos
  res.setHeader(
    'Permissions-Policy',
    'geolocation=(), microphone=(), camera=()'
  );

  next();
};

/**
 * Middleware de manejo de errores global
 * No expone detalles técnicos al cliente
 */
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  SecurityLogger.logSecurityEvent(
    'Unhandled error in request',
    'high',
    {
      error: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
    }
  );

  // No exponer detalles del error en producción
  const message =
    config.env === 'development'
      ? err.message
      : 'Ha ocurrido un error interno del servidor';

  res.status(500).json({
    success: false,
    message,
  });
};
