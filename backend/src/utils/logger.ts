import winston from 'winston';
import path from 'path';
import { config } from '../config';

/**
 * Logger centralizado con Winston
 * Registra eventos de seguridad sin exponer datos sensibles
 * Principio SOLID: Single Responsibility
 */

const logDir = config.logging.dir;

// Formato personalizado para logs
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      // Filtrar datos sensibles antes de loggear
      const safeMeta = sanitizeLogData(meta);
      msg += ` ${JSON.stringify(safeMeta)}`;
    }
    return msg;
  })
);

/**
 * Sanitizar datos sensibles de los logs
 * Previene exposición de contraseñas, tokens, datos biométricos, etc.
 */
function sanitizeLogData(data: Record<string, unknown>): Record<string, unknown> {
  const sensitiveKeys = [
    'password',
    'token',
    'secret',
    'authorization',
    'cookie',
    'biometric',
    'credential',
    'challenge',
  ];

  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    const keyLower = key.toLowerCase();
    const isSensitive = sensitiveKeys.some((sensitive) => keyLower.includes(sensitive));

    if (isSensitive) {
      sanitized[key] = '[REDACTED]';
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      sanitized[key] = sanitizeLogData(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

// Configuración de transportes
const transports: winston.transport[] = [
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      logFormat
    ),
  }),
];

// En producción, agregar archivo de logs
if (config.env === 'production') {
  transports.push(
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      format: logFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      format: logFormat,
      maxsize: 5242880,
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: path.join(logDir, 'security.log'),
      level: 'warn',
      format: logFormat,
      maxsize: 5242880,
      maxFiles: 10,
    })
  );
}

export const logger = winston.createLogger({
  level: config.logging.level,
  format: logFormat,
  transports,
  exitOnError: false,
});

/**
 * Logger específico para eventos de seguridad
 */
export class SecurityLogger {
  static logAuthAttempt(
    userId: string,
    success: boolean,
    method: string,
    ip: string
  ): void {
    const level = success ? 'info' : 'warn';
    logger.log(level, 'Authentication attempt', {
      userId,
      success,
      method,
      ip,
      timestamp: new Date().toISOString(),
    });
  }

  static logUnauthorizedAccess(
    userId: string,
    resource: string,
    ip: string
  ): void {
    logger.warn('Unauthorized access attempt', {
      userId,
      resource,
      ip,
      timestamp: new Date().toISOString(),
    });
  }

  static logSuspiciousActivity(
    description: string,
    metadata?: Record<string, unknown>
  ): void {
    logger.warn('Suspicious activity detected', {
      description,
      ...metadata,
      timestamp: new Date().toISOString(),
    });
  }

  static logDataAccess(
    userId: string,
    action: string,
    resource: string
  ): void {
    logger.info('Data access', {
      userId,
      action,
      resource,
      timestamp: new Date().toISOString(),
    });
  }

  static logSecurityEvent(
    event: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    metadata?: Record<string, unknown>
  ): void {
    const levelMap = {
      low: 'info',
      medium: 'warn',
      high: 'error',
      critical: 'error',
    };

    logger.log(levelMap[severity], `Security event: ${event}`, {
      severity,
      ...metadata,
      timestamp: new Date().toISOString(),
    });
  }

  static logAdminAction(
    userId: string,
    action: string,
    metadata?: Record<string, unknown>
  ): void {
    logger.info('Admin action', {
      userId,
      action,
      ...metadata,
      timestamp: new Date().toISOString(),
    });
  }
}

export default logger;
