import { Request, Response, NextFunction } from 'express';
import { JwtService, TokenPayload } from '../../application/services/JwtService';
import { SecurityLogger } from '../../utils/logger';
import { UserRole } from '../../domain/entities/User';

/**
 * Middleware de Autenticación
 * Verifica el JWT en cada petición protegida
 * 
 * Principio SOLID: Single Responsibility
 * - Solo verifica autenticación
 */

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
}

const jwtService = new JwtService();

/**
 * Middleware para verificar token JWT
 */
export const authenticate = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    // Obtener token del header Authorization
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      SecurityLogger.logUnauthorizedAccess(
        'unknown',
        req.path,
        req.ip || 'unknown'
      );

      res.status(401).json({
        success: false,
        message: 'Token de autenticación requerido',
      });
      return;
    }

    const token = authHeader.substring(7); // Remover 'Bearer '

    // Verificar token
    const payload = jwtService.verifyAccessToken(token);

    if (!payload) {
      SecurityLogger.logUnauthorizedAccess(
        'unknown',
        req.path,
        req.ip || 'unknown'
      );

      res.status(401).json({
        success: false,
        message: 'Token inválido o expirado',
      });
      return;
    }

    // Adjuntar información del usuario a la petición
    req.user = payload;
    next();
  } catch (error) {
    SecurityLogger.logSecurityEvent(
      'Authentication middleware error',
      'high',
      {
        path: req.path,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    );

    res.status(500).json({
      success: false,
      message: 'Error en el proceso de autenticación',
    });
  }
};

/**
 * Middleware para autorización basada en roles
 * Principio SOLID: Open/Closed - Extensible para nuevos roles
 * 
 * Patrón de Diseño: Strategy Pattern (variante)
 * - Diferentes estrategias de autorización según roles
 */
export const authorize = (...allowedRoles: UserRole[]) => {
  return (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): void => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'No autenticado',
        });
        return;
      }

      // Verificar si el rol del usuario está permitido
      if (!allowedRoles.includes(req.user.role)) {
        SecurityLogger.logUnauthorizedAccess(
          req.user.userId,
          req.path,
          req.ip || 'unknown'
        );

        res.status(403).json({
          success: false,
          message: 'No tiene permisos para acceder a este recurso',
        });
        return;
      }

      next();
    } catch (error) {
      SecurityLogger.logSecurityEvent(
        'Authorization middleware error',
        'high',
        {
          path: req.path,
          error: error instanceof Error ? error.message : 'Unknown error',
        }
      );

      res.status(500).json({
        success: false,
        message: 'Error en el proceso de autorización',
      });
    }
  };
};

/**
 * Middleware para verificar que el usuario solo puede acceder a sus propios datos
 * o es un admin
 */
export const authorizeOwnerOrAdmin = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'No autenticado',
      });
      return;
    }

    const targetUserId = req.params.userId || req.params.id;

    // Admin puede acceder a cualquier recurso
    if (req.user.role === UserRole.ADMIN) {
      next();
      return;
    }

    // Usuario normal solo puede acceder a sus propios datos
    if (req.user.userId !== targetUserId) {
      SecurityLogger.logUnauthorizedAccess(
        req.user.userId,
        req.path,
        req.ip || 'unknown'
      );

      res.status(403).json({
        success: false,
        message: 'Solo puede acceder a sus propios datos',
      });
      return;
    }

    next();
  } catch (error) {
    SecurityLogger.logSecurityEvent(
      'Owner/Admin authorization error',
      'high',
      {
        path: req.path,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    );

    res.status(500).json({
      success: false,
      message: 'Error en el proceso de autorización',
    });
  }
};
