import jwt from 'jsonwebtoken';
import { config } from '../../config';
import { User, UserRole } from '../../domain/entities/User';
import logger, { SecurityLogger } from '../../utils/logger';

/**
 * Servicio de JWT para gestión de tokens de sesión
 * 
 * Principio SOLID: Single Responsibility - Solo gestiona tokens JWT
 */

export interface TokenPayload {
  userId: string;
  email: string;
  role: UserRole;
  type: 'access' | 'refresh';
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export class JwtService {
  /**
   * Generar par de tokens (access + refresh)
   */
  generateTokenPair(user: User): TokenPair {
    try {
      const payload: Omit<TokenPayload, 'type'> = {
        userId: user.id!,
        email: user.email,
        role: user.role,
      };

      const accessToken = jwt.sign(
        { ...payload, type: 'access' },
        config.jwt.secret,
        {
          expiresIn: config.jwt.expiresIn,
          issuer: 'biometric-auth-system',
          audience: 'biometric-auth-client',
        } as jwt.SignOptions
      );

      const refreshToken = jwt.sign(
        { ...payload, type: 'refresh' },
        config.jwt.refreshSecret,
        {
          expiresIn: config.jwt.refreshExpiresIn,
          issuer: 'biometric-auth-system',
          audience: 'biometric-auth-client',
        } as jwt.SignOptions
      );

      logger.info('Token pair generated', { userId: user.id });

      return {
        accessToken,
        refreshToken,
      };
    } catch (error) {
      SecurityLogger.logSecurityEvent(
        'Error generating token pair',
        'high',
        {
          userId: user.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        }
      );
      throw new Error('Error al generar tokens de sesión');
    }
  }

  /**
   * Verificar y decodificar access token
   */
  verifyAccessToken(token: string): TokenPayload | null {
    try {
      const decoded = jwt.verify(token, config.jwt.secret, {
        issuer: 'biometric-auth-system',
        audience: 'biometric-auth-client',
      }) as TokenPayload;

      if (decoded.type !== 'access') {
        SecurityLogger.logSecurityEvent(
          'Invalid token type for access token',
          'medium',
          { tokenType: decoded.type }
        );
        return null;
      }

      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        logger.warn('Access token expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        SecurityLogger.logSecurityEvent(
          'Invalid access token',
          'medium',
          { error: error.message }
        );
      }
      return null;
    }
  }

  /**
   * Verificar y decodificar refresh token
   */
  verifyRefreshToken(token: string): TokenPayload | null {
    try {
      const decoded = jwt.verify(token, config.jwt.refreshSecret, {
        issuer: 'biometric-auth-system',
        audience: 'biometric-auth-client',
      }) as TokenPayload;

      if (decoded.type !== 'refresh') {
        SecurityLogger.logSecurityEvent(
          'Invalid token type for refresh token',
          'medium',
          { tokenType: decoded.type }
        );
        return null;
      }

      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        logger.warn('Refresh token expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        SecurityLogger.logSecurityEvent(
          'Invalid refresh token',
          'medium',
          { error: error.message }
        );
      }
      return null;
    }
  }

  /**
   * Decodificar token sin verificar (para debugging)
   */
  decodeToken(token: string): TokenPayload | null {
    try {
      return jwt.decode(token) as TokenPayload;
    } catch (error) {
      return null;
    }
  }

  /**
   * Verificar si un token está próximo a expirar (últimos 5 minutos)
   */
  isTokenExpiringSoon(token: string): boolean {
    try {
      const decoded = this.decodeToken(token);
      if (!decoded) return true;

      const payload: any = decoded;
      if (!payload.exp) return true;

      const expirationTime = payload.exp * 1000; // Convertir a milisegundos
      const currentTime = Date.now();
      const fiveMinutes = 5 * 60 * 1000;

      return expirationTime - currentTime < fiveMinutes;
    } catch (error) {
      return true;
    }
  }
}
